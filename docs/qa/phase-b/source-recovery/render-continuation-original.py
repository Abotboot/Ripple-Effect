import os
import sys
import time
import json
import subprocess
import socketserver
import http.server
import urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

FFMPEG_PATH = r"C:\Users\ayada\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe"

TOTAL_FRAMES = 120  # 4.0 seconds @ 30 fps
FPS = 30
DURATION = 4.0

class FrameReceiverServer:
    def __init__(self, root_dir, frames_dir):
        self.root_dir = Path(root_dir)
        self.frames_dir = Path(frames_dir)
        self.frames_received = 0
        self.start_time = None
        server_self = self
        
        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(server_self.root_dir), **kwargs)

            def do_POST(self):
                parsed = urllib.parse.urlparse(self.path)
                if parsed.path == "/upload_frame":
                    qs = urllib.parse.parse_qs(parsed.query)
                    idx = int(qs.get("index", ["0"])[0])
                    length = int(self.headers.get("Content-Length", 0))
                    data = self.rfile.read(length)
                    
                    frame_path = server_self.frames_dir / f"frame_{idx:04d}.jpg"
                    frame_path.write_bytes(data)
                    server_self.frames_received += 1
                    
                    if server_self.frames_received == 1:
                        server_self.start_time = time.time()
                    
                    if server_self.frames_received % 20 == 0 or server_self.frames_received == TOTAL_FRAMES:
                        elapsed = time.time() - server_self.start_time if server_self.start_time else 1
                        fps = server_self.frames_received / elapsed
                        print(f"Received frame {server_self.frames_received}/{TOTAL_FRAMES} ({(server_self.frames_received/TOTAL_FRAMES)*100:.1f}%) [{fps:.1f} fps]", flush=True)

                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain")
                    self.end_headers()
                    self.wfile.write(b"OK")
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, format, *args):
                pass

        self.server = socketserver.TCPServer(("127.0.0.1", 0), Handler)
        self.port = self.server.server_address[1]

    def serve_until_done(self):
        import threading
        t = threading.Thread(target=self.server.serve_forever, daemon=True)
        t.start()
        return t

def main():
    repo_root = Path(r"C:\Users\ayada\Ripple-Effect")
    recordings_dir = repo_root / "docs" / "qa" / "recordings"
    recordings_dir.mkdir(parents=True, exist_ok=True)
    
    assets_dir = repo_root / "docs" / "qa" / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    artifacts_dir = Path(r"C:\Users\ayada\.gemini\antigravity\brain\686d65b4-9efa-4212-8801-17023ab7dbab")
    scratch_dir = artifacts_dir / "scratch"
    scratch_dir.mkdir(parents=True, exist_ok=True)

    frames_dir = scratch_dir / "continuation_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    # Clean previous frames
    for old_f in frames_dir.glob("frame_*.jpg"):
        try: old_f.unlink()
        except: pass

    frame_server = FrameReceiverServer(repo_root, frames_dir)
    frame_server.serve_until_done()
    port = frame_server.port
    print(f"Frame streaming server running on port {port}", flush=True)

    handoff_data = None

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox']
        )
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.set_default_timeout(0)
        
        url = f"http://127.0.0.1:{port}/public/particle_continuation_driving_shot.html"
        print(f"Loading {url}", flush=True)
        page.goto(url)
        page.wait_for_function("window.RENDER_READY === true")

        # Extract particle handoff metadata
        handoff_data = page.evaluate("window.getParticleHandoffData()")
        print(f"Extracted handoff metadata for {len(handoff_data.get('particles', []))} particles.", flush=True)

        print(f"Triggering in-browser rendering loop of {TOTAL_FRAMES} frames (4.0s @ 30 fps)...", flush=True)
        t0 = time.time()
        
        page.evaluate(f"""async () => {{
            const total = {TOTAL_FRAMES};
            const c = document.getElementById('c');
            for (let i = 0; i < total; i++) {{
                const tau = i / (total - 1);
                window.setCameraTime(tau);
                const blob = await new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.95));
                await fetch(`/upload_frame?index=${{i}}`, {{
                    method: 'POST',
                    body: blob
                }});
            }}
            window.ALL_FRAMES_DONE = true;
        }}""")

        page.wait_for_function("window.ALL_FRAMES_DONE === true")
        total_time = time.time() - t0
        print(f"All {TOTAL_FRAMES} frames captured in {total_time:.1f}s ({TOTAL_FRAMES/total_time:.1f} fps)!", flush=True)

        browser.close()
    
    frame_server.server.shutdown()

    # Verify frame files
    saved_frames = list(frames_dir.glob("frame_*.jpg"))
    print(f"Total frame files on disk: {len(saved_frames)}", flush=True)
    if len(saved_frames) < TOTAL_FRAMES:
        raise RuntimeError(f"Expected {TOTAL_FRAMES} frames, but found {len(saved_frames)}")

    # Save particle handoff JSON
    handoff_json_path1 = assets_dir / "particle_positions_handoff.json"
    handoff_json_path2 = artifacts_dir / "particle_positions_handoff.json"
    handoff_str = json.dumps(handoff_data, indent=2)
    handoff_json_path1.write_text(handoff_str)
    handoff_json_path2.write_text(handoff_str)
    print(f"Saved particle positions handoff: {handoff_json_path1}", flush=True)

    input_pattern = str(frames_dir / "frame_%04d.jpg")

    # 1. Encode MP4
    out_mp4 = str(recordings_dir / "07-continuation-driving-shot.mp4")
    print(f"Encoding MP4: {out_mp4}", flush=True)
    cmd_mp4 = [
        FFMPEG_PATH,
        "-y",
        "-framerate", str(FPS),
        "-i", input_pattern,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "slow",
        "-crf", "17",
        out_mp4
    ]
    subprocess.run(cmd_mp4, check=True)

    # Copy to alternate name 06-optical-to-particles-driving.mp4
    out_mp4_alt = str(recordings_dir / "06-optical-to-particles-driving.mp4")
    Path(out_mp4_alt).write_bytes(Path(out_mp4).read_bytes())

    # 2. Encode WebM
    out_webm = str(recordings_dir / "07-continuation-driving-shot.webm")
    print(f"Encoding WebM: {out_webm}", flush=True)
    cmd_webm = [
        FFMPEG_PATH,
        "-y",
        "-framerate", str(FPS),
        "-i", input_pattern,
        "-c:v", "libvpx-vp9",
        "-pix_fmt", "yuv420p",
        "-b:v", "2.5M",
        out_webm
    ]
    subprocess.run(cmd_webm, check=True)

    # 3. Generate Preview GIF
    out_gif = str(recordings_dir / "07-continuation-driving-shot_preview.gif")
    print(f"Generating preview GIF: {out_gif}", flush=True)
    cmd_gif = [
        FFMPEG_PATH,
        "-y",
        "-i", out_mp4,
        "-vf", "fps=20,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
        out_gif
    ]
    subprocess.run(cmd_gif, check=True)

    # Copy keyframes for display and artifact embedding
    key_indices = [0, 5, 36, 60, 84, 96, 119]
    for idx in key_indices:
        src = frames_dir / f"frame_{idx:04d}.jpg"
        dst_scratch = scratch_dir / f"continuation_keyframe_{idx:04d}.jpg"
        dst_artifact = artifacts_dir / f"continuation_keyframe_{idx:04d}.jpg"
        if src.exists():
            data = src.read_bytes()
            dst_scratch.write_bytes(data)
            dst_artifact.write_bytes(data)

    # First and last frames specifically
    (artifacts_dir / "continuation_first_frame.jpg").write_bytes((frames_dir / "frame_0000.jpg").read_bytes())
    (artifacts_dir / "continuation_last_frame.jpg").write_bytes((frames_dir / "frame_0119.jpg").read_bytes())
    (recordings_dir / "continuation_first_frame.jpg").write_bytes((frames_dir / "frame_0000.jpg").read_bytes())
    (recordings_dir / "continuation_last_frame.jpg").write_bytes((frames_dir / "frame_0119.jpg").read_bytes())

    # Copy deliverables to artifact directory
    (artifacts_dir / "07-continuation-driving-shot.mp4").write_bytes(Path(out_mp4).read_bytes())
    (artifacts_dir / "07-continuation-driving-shot.webm").write_bytes(Path(out_webm).read_bytes())
    (artifacts_dir / "07-continuation-driving-shot_preview.gif").write_bytes(Path(out_gif).read_bytes())

    print("\nALL CONTINUATION DELIVERABLES COMPLETE!", flush=True)
    print(f"MP4 Path: {out_mp4} ({os.path.getsize(out_mp4)} bytes)", flush=True)
    print(f"WebM Path: {out_webm} ({os.path.getsize(out_webm)} bytes)", flush=True)
    print(f"GIF Path: {out_gif} ({os.path.getsize(out_gif)} bytes)", flush=True)

if __name__ == "__main__":
    main()
