/** Gesture-only, opt-in hydrophone. One engine owned by the hero. */
export function createHydrophone() {
  let ctx: AudioContext | undefined
  let master: GainNode | undefined
  let enabled = false
  let disposed = false
  return {
    async toggle() {
      if (disposed) return false
      if (!ctx) {
        ctx = new AudioContext()
        master = ctx.createGain()
        master.gain.value = 0
        master.connect(ctx.destination)
        for (const frequency of [52, 55.5]) {
          const osc = ctx.createOscillator()
          osc.frequency.value = frequency
          osc.connect(master)
          osc.start()
        }
      }
      enabled = !enabled
      try {
        if (enabled) await ctx.resume()
        if (disposed) return false
        master!.gain.cancelScheduledValues(ctx.currentTime)
        master!.gain.setTargetAtTime(enabled ? 0.025 : 0, ctx.currentTime, 0.2)
        return enabled
      } catch { enabled = false; return false }
    },
    knock() {
      if (!enabled || !ctx || !master || disposed) return
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      const now = ctx.currentTime
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.22)
      gain.gain.setValueAtTime(1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.connect(gain); gain.connect(master)
      osc.onended = () => { osc.disconnect(); gain.disconnect() }
      osc.start(); osc.stop(now + 0.26)
    },
    visibility(hidden: boolean) {
      if (!ctx || disposed) return
      if (hidden) void ctx.suspend().catch(() => {})
      else if (enabled) void ctx.resume().catch(() => {})
    },
    dispose() { disposed = true; enabled = false; if (ctx) void ctx.close().catch(() => {}) },
  }
}
