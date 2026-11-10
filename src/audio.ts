import { store } from './store';
import { VOICE_SAMPLE } from './lines';
import { normalizePhrase, phraseKey, type VoiceManifest } from './voicekey';
import { forSpeech } from './pronounce/dictionary';

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
// Prefer natural-sounding voices; eSpeak (the Linux default) is the last resort.
// Through speech-dispatcher eSpeak shows up as «Russian», plus ~200 «Russian+Mario»-style variants.
const isEspeak = (name: string) => /espeak|\+|^russian( \(|$)/i.test(name);
const NICE = ['anna', 'elena', 'irina', 'aleksandr-hq', 'victoria', 'arina', 'tatiana'];

const voiceRank = (v: SpeechSynthesisVoice) => {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  const region = lang === 'ru-ru' || lang === 'ru' ? 0 : 0.5;
  if (/natural|online|neural/.test(name)) return region;
  if (isEspeak(name)) return 30 + region;
  const nice = NICE.indexOf(name);
  return (nice >= 0 ? 10 + nice : 20) + region;
};

/** Russian voices worth offering, best first; eSpeak variants only if nothing else exists. */
export function ruVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  const ru = speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith('ru'));
  const real = ru.filter(v => !isEspeak(v.name));
  const list = real.length ? real : ru.filter(v => !v.name.includes('+'));
  return list.sort((a, b) => voiceRank(a) - voiceRank(b));
}

function voice() {
  const list = ruVoices();
  return list.find(v => v.name === store.voice) ?? list[0] ?? null;
}

export const voiceName = () => voice()?.name ?? '';

/** Switch to the next voice and let it introduce itself. */
export function nextVoice() {
  const list = ruVoices();
  if (!list.length) return '';
  const i = list.findIndex(v => v.name === voiceName());
  store.voice = list[(i + 1) % list.length].name;
  previewVoice();
  return store.voice;
}

/** Say the sample with the browser voice, the way it will read the game (voice, stress marks). */
export function previewVoice() {
  stopSpeaking();
  tts(VOICE_SAMPLE, () => {});
}

// ---------- recorded phrases (made in the voice studio) ----------
let recorded: Record<string, string> = {};

/** Reads public/voice/manifest.json; no manifest simply means no recordings. */
export async function loadRecordings() {
  try {
    const r = await fetch('voice/manifest.json', { cache: 'no-cache' });
    if (r.ok) recorded = ((await r.json()) as VoiceManifest).files ?? {};
  } catch { /* offline or no recordings */ }
}

let token = 0;
let playing: HTMLAudioElement | null = null;

function tts(text: string, done: () => void) {
  const v = voice();
  if (!v || !('speechSynthesis' in window)) return done();
  try {
    // Respellings and stress marks go to the synthesizer only; recordings are found by the plain text.
    const u = new SpeechSynthesisUtterance(forSpeech(normalizePhrase(text), store.stress));
    u.voice = v;
    u.lang = v.lang;
    u.rate = 0.95;
    u.pitch = 1.1;
    u.onend = () => done();
    u.onerror = () => done();
    speechSynthesis.speak(u);
  } catch { done(); /* a broken voice must never break the game */ }
}

/** Say phrases one after another: a recording if there is one, otherwise the browser voice. */
export function speakSeq(texts: string[]) {
  stopSpeaking();
  if (!store.sound) return;
  const my = token;
  const next = (i: number) => {
    if (my !== token || i >= texts.length) return;
    const text = texts[i];
    const file = recorded[phraseKey(text)];
    if (!file) return tts(text, () => next(i + 1));
    const a = new Audio(`voice/${file}`);
    playing = a;
    let fellBack = false;
    const fallback = () => { if (!fellBack && my === token) { fellBack = true; tts(text, () => next(i + 1)); } };
    a.onended = () => next(i + 1);
    a.onerror = fallback;
    a.play().catch(fallback);
  };
  next(0);
}

export const speak = (text: string) => speakSeq([text]);

export function stopSpeaking() {
  token++;
  playing?.pause();
  playing = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
