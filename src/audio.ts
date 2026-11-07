import { store } from './store';

// Tiny synthesized sound effects: no audio files to ship.
let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const a = ac();
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.25) {
  const a = ac();
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 1800;
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

const SFX = {
  click: () => tone(660, 0, 0.06, 'triangle', 0.12),
  pick: () => tone(520, 0, 0.08, 'triangle', 0.14),
  unpick: () => tone(380, 0, 0.08, 'triangle', 0.12),
  chop: () => noise(0, 0.09),
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle')),
  bad: () => { tone(330, 0, 0.18, 'square', 0.08); tone(247, 0.16, 0.3, 'square', 0.08); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1319, 0.08, 0.2, 'square', 0.07); },
  star: () => tone(880, 0, 0.25, 'triangle', 0.15),
  angry: () => [220, 196, 175].forEach((f, i) => tone(f, i * 0.12, 0.16, 'sawtooth', 0.06)),
};

export type Sfx = keyof typeof SFX;

export function sfx(name: Sfx) {
  if (!store.sound) return;
  try { SFX[name](); } catch { /* audio blocked until first gesture */ }
}

// Orders are read aloud so a slow reader is not tested on reading instead of fractions.
let ruVoice: SpeechSynthesisVoice | null | undefined;
function voice() {
  if (ruVoice !== undefined && ruVoice !== null) return ruVoice;
  const voices = speechSynthesis.getVoices();
  ruVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ru')) ?? null;
  return ruVoice;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { ruVoice = undefined; voice(); };

export function speak(text: string) {
  if (!store.sound || !('speechSynthesis' in window)) return;
  const v = voice();
  if (!v) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/«|»/g, ''));
  u.voice = v;
  u.lang = v.lang;
  u.rate = 0.95;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}

export const stopSpeaking = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
