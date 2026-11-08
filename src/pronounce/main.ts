// A page to hear stress and spelling variants on each device and pick what the game uses there.
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/900.css';
import { ACUTE, STRESS_MODES, forSpeech, type StressMode } from './dictionary';
import { PHRASES, WORDS } from './samples';
import { store } from '../store';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const voiceSel = $<HTMLSelectElement>('voice');

const voices = () => speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('ru'));

function fillVoices() {
  const list = voices();
  const keep = voiceSel.value || store.voice;
  voiceSel.innerHTML = '';
  for (const v of list) {
    const o = document.createElement('option');
    o.value = v.name;
    o.textContent = `${v.name}${v.localService ? '' : ' (онлайн)'}`;
    voiceSel.append(o);
  }
  if (list.some(v => v.name === keep)) voiceSel.value = keep;
  showInfo();
}

function showInfo() {
  const v = voices().find(x => x.name === voiceSel.value);
  $('info').textContent = `${navigator.userAgent} · голос: ${v ? `${v.name}, ${v.lang}, ${v.voiceURI}` : 'нет русских голосов'}`;
}

let current: HTMLButtonElement | null = null;
function say(text: string, btn?: HTMLButtonElement) {
  speechSynthesis.cancel();
  current?.classList.remove('playing');
  const v = voices().find(x => x.name === voiceSel.value);
  const u = new SpeechSynthesisUtterance(text);
  if (v) { u.voice = v; u.lang = v.lang; }
  // The same settings as in the game.
  u.rate = 0.95;
  u.pitch = 1.1;
  if (btn) {
    current = btn;
    btn.classList.add('playing');
    u.onend = u.onerror = () => btn.classList.remove('playing');
  }
  speechSynthesis.speak(u);
}

/** Columns: as written, respelled (only where it differs), then each way of marking stress. */
function variants(text: string): (string | null)[] {
  const respelled = forSpeech(text, 'none');
  return [
    text,
    respelled !== text ? respelled : null,
    ...(['acute', 'caps'] as StressMode[]).map(m => {
      const v = forSpeech(text, m);
      return v !== respelled ? v : null;
    }),
  ];
}

function fill(tbody: HTMLElement, texts: string[]) {
  for (const text of texts) {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = text;
    tr.append(name);
    for (const v of variants(text)) {
      const td = document.createElement('td');
      td.className = 'v';
      if (v) {
        const b = document.createElement('button');
        b.innerHTML = '▶ <small></small>';
        b.querySelector('small')!.textContent = v;
        b.onclick = () => say(v, b);
        td.append(b);
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
}

function modePicker() {
  const box = $('modes');
  for (const { mode, label } of STRESS_MODES) {
    const l = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = 'stress';
    r.value = mode;
    r.checked = store.stress === mode;
    r.onchange = () => { store.stress = mode; };
    l.append(r, ` ${label}`);
    box.append(l);
  }
}

fill($('words'), WORDS);
fill($('phrases'), PHRASES);
modePicker();
fillVoices();
speechSynthesis.addEventListener('voiceschanged', fillVoices);
voiceSel.onchange = showInfo;
$('stop').onclick = () => speechSynthesis.cancel();
$('say').onclick = () => say($<HTMLInputElement>('custom').value, $('say'));
$('sayGame').onclick = () => say(forSpeech($<HTMLInputElement>('custom').value, store.stress), $('sayGame'));
$('accent').onclick = () => {
  const input = $<HTMLInputElement>('custom');
  const pos = input.selectionStart ?? input.value.length;
  input.value = input.value.slice(0, pos) + ACUTE + input.value.slice(pos);
  input.focus();
  input.setSelectionRange(pos + 1, pos + 1);
};
