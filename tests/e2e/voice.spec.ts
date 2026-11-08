import { expect, test } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
import { noErrors, openGame } from './helpers';

const PHRASE = 'Вот уважил старика!';
const KEY = '5c6f5a79';

test('a recorded phrase plays instead of speech synthesis', async ({ page }) => {
  await page.route('**/voice/manifest.json', r => r.fulfill({ json: { version: 1, files: { [KEY]: `${KEY}.wav` } } }));
  await page.addInitScript(() => {
    const w = window as any;
    w.__audio = [];
    w.__tts = [];
    const A = window.Audio;
    w.Audio = function (src: string) {
      w.__audio.push(src);
      const a = new A(src);
      a.play = () => { setTimeout(() => a.onended?.(new Event('ended')), 10); return Promise.resolve(); };
      return a;
    };
    speechSynthesis.getVoices = () => [{ name: 'Test', lang: 'ru-RU' } as SpeechSynthesisVoice];
    // A fake voice is not a real SpeechSynthesisVoice: let the utterance accept it.
    Object.defineProperty(SpeechSynthesisUtterance.prototype, 'voice', {
      configurable: true,
      get() { return this._voice; },
      set(v) { this._voice = v; },
    });
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => { w.__tts.push(u.text); setTimeout(() => u.onend?.({} as any), 10); };
  });
  const errors = await openGame(page, { sound: true });
  const result = await page.evaluate(async phrase => {
    const audio = await import('/src/audio.ts');
    audio.speakSeq([phrase, 'Фраза без записи']);
    await new Promise(r => setTimeout(r, 300));
    const w = window as any;
    return { audio: w.__audio, tts: w.__tts };
  }, PHRASE);
  expect(result.audio).toEqual([`voice/${KEY}.wav`]);
  expect(result.tts).toHaveLength(1); // the unrecorded phrase falls back to TTS
  await noErrors(errors);
});

test('the synthesizer gets «пица» and the stress chosen for this device', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__tts = [];
    speechSynthesis.getVoices = () => [{ name: 'Test', lang: 'ru-RU' } as SpeechSynthesisVoice];
    Object.defineProperty(SpeechSynthesisUtterance.prototype, 'voice', {
      configurable: true,
      get() { return this._voice; },
      set(v) { this._voice = v; },
    });
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => { w.__tts.push(u.text); setTimeout(() => u.onend?.({} as any), 10); };
  });
  const errors = await openGame(page, { sound: true, stress: 'caps' });
  const tts = await page.evaluate(async () => {
    const audio = await import('/src/audio.ts');
    audio.speak('Это Екибас. Он любит пиццу.');
    await new Promise(r => setTimeout(r, 300));
    return (window as any).__tts;
  });
  expect(tts).toEqual(['Это ЕкибАс. Он любит пицу.']);
  await noErrors(errors);
});

test('studio exports recordings as a zip with a manifest', async ({ page }) => {
  await page.goto('/studio.html');
  await page.waitForSelector('#list .item');
  const key = await page.evaluate(async () => {
    const text = document.getElementById('text')!.textContent!;
    const { phraseKey } = await import('/src/voicekey.ts');
    const k = phraseKey(text);
    const sr = 48000;
    const pcm = new Float32Array(sr / 2).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr));
    const db: IDBDatabase = await new Promise(res => { const r = indexedDB.open('polovinkino-studio', 1); r.onsuccess = () => res(r.result); });
    await new Promise(res => {
      const tx = db.transaction('takes', 'readwrite');
      tx.objectStore('takes').put({ key: k, text, speaker: 'narrator', pcm, sampleRate: sr, updated: Date.now() });
      tx.oncomplete = res;
    });
    return k;
  });
  await page.reload();
  await page.waitForSelector('#list .dot.take');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
  const zip = unzipSync(new Uint8Array(await (await download.createReadStream()).toArray().then(c => Buffer.concat(c))));
  const manifest = JSON.parse(strFromU8(zip['public/voice/manifest.json']));
  expect(manifest.files[key]).toBe(`${key}.wav`);
  const wav = zip[`public/voice/${key}.wav`];
  expect(strFromU8(wav.slice(0, 4))).toBe('RIFF');
  expect(wav.length).toBe(44 + 12000 * 2); // 0.5 s at 24 kHz, 16-bit mono
});
