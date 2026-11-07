// A recorded phrase is stored under a short hash of its text, so the game finds a
// recording by the exact words it is about to say. Shared by the game and the studio.

export const normalizePhrase = (text: string) => text.replace(/[«»]/g, '').replace(/\s+/g, ' ').trim();

/** FNV-1a over the normalized text, 8 hex chars. */
export function phraseKey(text: string) {
  const s = normalizePhrase(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** public/voice/manifest.json */
export interface VoiceManifest {
  version: 1;
  /** phrase key -> file name inside public/voice/ */
  files: Record<string, string>;
}
