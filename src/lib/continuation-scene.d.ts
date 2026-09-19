/** Disconnected offline candidate; uses a fixed 1920 x 1080 raster at pixel ratio 1. */
export interface ContinuationScene {
  /** Absolute source-scene time. Terminal source state is 4.0, not video PTS 119/30. */
  renderAtSeconds(time: number): void;
  /** Restore the fixed source raster. Does not accept viewport dimensions. */
  resize(): void;
  setPointer(x: null): void;
  setPointer(x: number, y: number): void;
  scatter(): void;
  /** Idempotent. All other methods reject calls after disposal. */
  dispose(): void;
}
export function createContinuationScene(canvas: HTMLCanvasElement): ContinuationScene;
