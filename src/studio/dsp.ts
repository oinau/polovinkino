// Small audio helpers for the studio: clean up a take, apply the character pitch, write WAV.

/** Mono mixdown, silence trimmed at both ends, peak normalized to about -1 dBFS. */
export function processRecording(buf: AudioBuffer): { pcm: Float32Array<ArrayBuffer>; sampleRate: number } {
  const sr = buf.sampleRate;
  const mono = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / buf.numberOfChannels;
  }

  // Loudness in 10 ms windows; speech is where it rises well above the quietest part.
  const win = Math.floor(sr / 100);
  const rms: number[] = [];
  for (let i = 0; i < mono.length; i += win) {
    let sum = 0;
    const end = Math.min(mono.length, i + win);
    for (let j = i; j < end; j++) sum += mono[j] * mono[j];
    rms.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  const loudest = Math.max(0, ...rms);
  if (loudest < 0.005) return { pcm: new Float32Array(0), sampleRate: sr };
  const threshold = Math.max(0.01, loudest * 0.1);
  const first = rms.findIndex(v => v > threshold);
  let last = rms.length - 1;
  while (last > first && rms[last] <= threshold) last--;
  const start = Math.max(0, (first - 12) * win); // keep 120 ms before
  const end = Math.min(mono.length, (last + 20) * win); // and 200 ms after
  const pcm = mono.slice(start, end);

  let peak = 0;
  for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;

  // Short fades so the cut edges don't click.
  const fade = Math.min(pcm.length >> 1, Math.floor(sr * 0.01));
  for (let i = 0; i < fade; i++) {
    pcm[i] *= i / fade;
    pcm[pcm.length - 1 - i] *= i / fade;
  }
  return { pcm, sampleRate: sr };
}

/** Cartoon-style pitch: plays the take faster or slower (pitch and tempo together) and resamples. */
export async function render(pcm: Float32Array<ArrayBuffer>, sampleRate: number, rate: number, outRate: number) {
  const seconds = pcm.length / sampleRate / rate;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(seconds * outRate)), outRate);
  const buf = off.createBuffer(1, pcm.length, sampleRate);
  buf.copyToChannel(pcm, 0);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0);
}

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number) {
  const out = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  out.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); // PCM
  out.setUint16(22, 1, true); // mono
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Uint8Array(out.buffer);
}
