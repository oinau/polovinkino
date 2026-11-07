// Voice studio: record every phrase of the game with a microphone, give each
// character a pitch, and download everything as a zip for public/voice/.
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/900.css';
import { zipSync, strToU8 } from 'fflate';
import { allPhrases, SPEAKERS, type Phrase, type Speaker } from '../phrases';
import type { VoiceManifest } from '../voicekey';
import { getRates, getTakes, deleteTake, putTake, setRate, type Take } from './db';
import { encodeWav, processRecording, render } from './dsp';

const OUT_RATE = 24000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const phrases = allPhrases();
const takes = new Map<string, Take>();
let projectFiles: Record<string, string> = {};
let rates: Record<string, number> = {};
let filter: Speaker | 'all' = 'all';
let onlyMissing = false;
let current = 0;

const ctx = new AudioContext();
let playing: AudioBufferSourceNode | HTMLAudioElement | null = null;

const rateOf = (s: Speaker) => rates[s] ?? SPEAKERS[s].rate;
const visible = () => phrases.filter(p =>
  (filter === 'all' || p.speaker === filter) && (!onlyMissing || !(takes.has(p.key) || projectFiles[p.key])));
const cur = (): Phrase | undefined => visible()[current];

// ---------- rendering ----------
function renderFilters() {
  const box = $('filters');
  box.innerHTML = '';
  const chip = (label: string, on: boolean, click: () => void) => {
    const b = document.createElement('button');
    b.className = 'chip' + (on ? ' on' : '');
    b.textContent = label;
    b.onclick = click;
    box.append(b);
  };
  const done = (s?: Speaker) => phrases.filter(p => (!s || p.speaker === s) && (takes.has(p.key) || projectFiles[p.key])).length;
  const total = (s?: Speaker) => phrases.filter(p => !s || p.speaker === s).length;
  chip(`Все ${done()}/${total()}`, filter === 'all', () => setFilter('all'));
  for (const s of Object.keys(SPEAKERS) as Speaker[]) {
    if (!total(s)) continue;
    chip(`${SPEAKERS[s].name} ${done(s)}/${total(s)}`, filter === s, () => setFilter(s));
  }
  chip(onlyMissing ? '✓ только незаписанные' : 'только незаписанные', onlyMissing, () => {
    onlyMissing = !onlyMissing;
    current = 0;
    renderAll();
  });
  $('count').textContent = `Записано ${done()} из ${total()}`;
  $('bar').style.width = `${(100 * done()) / Math.max(1, total())}%`;
}

function setFilter(f: Speaker | 'all') {
  filter = f;
  current = 0;
  renderAll();
}

function renderList() {
  const list = $('list');
  list.innerHTML = '';
  visible().forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'item' + (i === current ? ' cur' : '');
    const status = takes.has(p.key) ? 'take' : projectFiles[p.key] ? 'project' : '';
    row.innerHTML = `<span class="dot ${status}"></span><span><b style="color:${SPEAKERS[p.speaker].color}">${SPEAKERS[p.speaker].name}:</b> </span>`;
    row.lastElementChild!.append(p.text);
    row.onclick = () => { current = i; renderAll(); };
    list.append(row);
    if (i === current) requestAnimationFrame(() => row.scrollIntoView({ block: 'nearest' }));
  });
}

function renderCard() {
  const p = cur();
  const who = $('who');
  if (!p) {
    who.textContent = '';
    $('where').textContent = '';
    $('text').textContent = onlyMissing ? 'Всё записано!' : 'Нет фраз';
    return;
  }
  who.textContent = SPEAKERS[p.speaker].name;
  who.style.background = SPEAKERS[p.speaker].color;
  $('where').textContent = p.where;
  $('text').textContent = p.text;
  const has = takes.has(p.key) || !!projectFiles[p.key];
  $<HTMLButtonElement>('play').disabled = !has;
  $<HTMLButtonElement>('del').disabled = !takes.has(p.key);
  const r = rateOf(p.speaker);
  $<HTMLInputElement>('rate').value = String(r);
  $('rateVal').textContent = `×${r.toFixed(2)}`;
  $('rateNote').textContent = `Тон общий для всех фраз персонажа «${SPEAKERS[p.speaker].name}».`;
}

function renderAll() {
  renderFilters();
  renderList();
  renderCard();
}

// ---------- playback ----------
function stop() {
  if (playing instanceof HTMLAudioElement) playing.pause();
  else playing?.stop();
  playing = null;
}

async function play() {
  const p = cur();
  if (!p) return;
  stop();
  await ctx.resume();
  const take = takes.get(p.key);
  if (take) {
    const buf = ctx.createBuffer(1, take.pcm.length, take.sampleRate);
    buf.copyToChannel(take.pcm, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rateOf(p.speaker);
    src.connect(ctx.destination);
    src.start();
    playing = src;
  } else if (projectFiles[p.key]) {
    const a = new Audio(`voice/${projectFiles[p.key]}`);
    a.play();
    playing = a;
  }
}

// ---------- recording ----------
let recorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let meterRaf = 0;

async function startRecording() {
  stop();
  await ctx.resume();
  stream ??= await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const chunks: Blob[] = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => finishRecording(new Blob(chunks, { type: recorder?.mimeType }));
  recorder.start();
  $('rec').classList.add('on');
  $('rec').textContent = '■ Стоп';
  drawMeter(stream);
}

function stopRecording() {
  recorder?.stop();
  $('rec').classList.remove('on');
  $('rec').textContent = '● Запись';
  cancelAnimationFrame(meterRaf);
}

async function finishRecording(blob: Blob) {
  const p = cur();
  recorder = null;
  if (!p) return;
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const { pcm, sampleRate } = processRecording(decoded);
    if (!pcm.length) return alert('Тишина — ничего не записалось. Проверьте микрофон.');
    const take: Take = { key: p.key, text: p.text, speaker: p.speaker, pcm, sampleRate, updated: Date.now() };
    await putTake(take);
    takes.set(p.key, take);
    renderAll();
    play();
  } catch (e) {
    alert(`Не получилось обработать запись: ${e}`);
  }
}

function drawMeter(s: MediaStream) {
  const canvas = $<HTMLCanvasElement>('meter');
  const g = canvas.getContext('2d')!;
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  ctx.createMediaStreamSource(s).connect(an);
  const data = new Float32Array(an.fftSize);
  const tick = () => {
    an.getFloatTimeDomainData(data);
    let peak = 0;
    for (const v of data) peak = Math.max(peak, Math.abs(v));
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = peak > 0.9 ? '#D9734E' : '#8A9A5B';
    g.fillRect(0, 0, canvas.width * Math.min(1, peak * 1.4), canvas.height);
    meterRaf = requestAnimationFrame(tick);
  };
  tick();
}

// ---------- export ----------
async function exportZip() {
  const btn = $<HTMLButtonElement>('export');
  btn.disabled = true;
  btn.textContent = 'Собираю…';
  try {
    const files: Record<string, Uint8Array> = {};
    const manifest: VoiceManifest = { version: 1, files: {} };
    const index: string[] = [];
    for (const p of phrases) {
      const take = takes.get(p.key);
      let data: Uint8Array | null = null;
      let name = `${p.key}.wav`;
      if (take) {
        data = encodeWav(await render(take.pcm, take.sampleRate, rateOf(p.speaker), OUT_RATE), OUT_RATE);
      } else if (projectFiles[p.key]) {
        name = projectFiles[p.key];
        const r = await fetch(`voice/${name}`);
        if (r.ok) data = new Uint8Array(await r.arrayBuffer());
      }
      if (!data) continue;
      files[`public/voice/${name}`] = data;
      manifest.files[p.key] = name;
      index.push(`${name}\t${SPEAKERS[p.speaker].name}\t${p.text}`);
    }
    files['public/voice/manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
    files['public/voice/index.tsv'] = strToU8(`file\tspeaker\ttext\n${index.join('\n')}\n`);
    // WAV barely compresses; store it to keep zipping fast.
    const zip = zipSync(files, { level: 0 });
    const url = URL.createObjectURL(new Blob([zip.buffer as ArrayBuffer], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `polovinkino-voice-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Скачать всё (zip)';
  }
}

// ---------- wiring ----------
function move(step: number) {
  const n = visible().length;
  if (!n) return;
  current = (current + step + n) % n;
  stop();
  renderAll();
}

$('rec').onclick = () => (recorder ? stopRecording() : startRecording().catch(e => alert(`Нет доступа к микрофону: ${e}`)));
$('play').onclick = () => play();
$('del').onclick = async () => {
  const p = cur();
  if (!p || !takes.has(p.key) || !confirm('Удалить эту запись?')) return;
  await deleteTake(p.key);
  takes.delete(p.key);
  renderAll();
};
$('prev').onclick = () => move(-1);
$('next').onclick = () => move(1);
$('export').onclick = () => exportZip();
$<HTMLInputElement>('rate').oninput = async e => {
  const p = cur();
  if (!p) return;
  const v = Number((e.target as HTMLInputElement).value);
  rates[p.speaker] = v;
  $('rateVal').textContent = `×${v.toFixed(2)}`;
  await setRate(p.speaker, v);
};
$<HTMLInputElement>('rate').onchange = () => play();

document.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); $('rec').click(); }
  else if (e.code === 'Enter') { e.preventDefault(); play(); }
  else if (e.code === 'ArrowRight') move(1);
  else if (e.code === 'ArrowLeft') move(-1);
});

async function init() {
  if (!window.isSecureContext) $('insecure').style.display = 'block';
  for (const t of await getTakes()) takes.set(t.key, t);
  rates = await getRates();
  try {
    const r = await fetch('voice/manifest.json', { cache: 'no-cache' });
    if (r.ok) projectFiles = ((await r.json()) as VoiceManifest).files ?? {};
  } catch { /* no recordings in the project yet */ }
  renderAll();
}

init();
