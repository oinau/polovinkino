// A page to hear stress and spelling variants on each device: which one a voice says best.
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/900.css';

import { ACUTE, SAMPLES, variant } from './samples';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const voiceSel = $<HTMLSelectElement>('voice');

function voices() {
  return speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('ru'));
}

function fillVoices() {
  const list = voices();
  const keep = voiceSel.value;
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

function render() {
  const rows = $('rows');
  for (const s of SAMPLES) {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = s.text;
    tr.append(name);
    for (const kind of ['plain', 'acute', 'caps', 'respell'] as const) {
      const td = document.createElement('td');
      td.className = 'v';
      const text = variant(s, kind);
      if (text) {
        const b = document.createElement('button');
        b.innerHTML = '▶ <small></small>';
        b.querySelector('small')!.textContent = text;
        b.onclick = () => say(text, b);
        td.append(b);
      }
      tr.append(td);
    }
    rows.append(tr);
  }
}

render();
fillVoices();
speechSynthesis.addEventListener('voiceschanged', fillVoices);
voiceSel.onchange = showInfo;
$('stop').onclick = () => speechSynthesis.cancel();
$('say').onclick = () => say($<HTMLInputElement>('custom').value, $('say'));
$('accent').onclick = () => {
  const input = $<HTMLInputElement>('custom');
  const pos = input.selectionStart ?? input.value.length;
  input.value = input.value.slice(0, pos) + ACUTE + input.value.slice(pos);
  input.focus();
  input.setSelectionRange(pos + 1, pos + 1);
};
