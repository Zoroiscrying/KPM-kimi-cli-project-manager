// Subtle completion chime played when a Kimi turn finishes.
// Uses WebAudio so no asset file is needed.
export function playCompletionSound(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(659.25, t); // E5
    osc.frequency.setValueAtTime(987.77, t + 0.07); // B5
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Audio is best-effort; ignore failures (e.g. autoplay restrictions).
  }
}
