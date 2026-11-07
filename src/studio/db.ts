// Takes live in IndexedDB so nothing is lost on reload before the zip is downloaded.
const DB = 'polovinkino-studio';

export interface Take {
  key: string;
  text: string;
  speaker: string;
  /** Mono, trimmed and normalized. */
  pcm: Float32Array<ArrayBuffer>;
  sampleRate: number;
  updated: number;
}

let dbp: Promise<IDBDatabase> | null = null;
function db() {
  return (dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('takes', { keyPath: 'key' });
      req.result.createObjectStore('settings');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const tx = (await db()).transaction(store, mode);
  const req = fn(tx.objectStore(store));
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const getTakes = () => run<Take[]>('takes', 'readonly', s => s.getAll());
export const putTake = (t: Take) => run('takes', 'readwrite', s => s.put(t));
export const deleteTake = (key: string) => run('takes', 'readwrite', s => s.delete(key));

export async function getRates(): Promise<Record<string, number>> {
  return (await run<Record<string, number> | undefined>('settings', 'readonly', s => s.get('rates'))) ?? {};
}

export async function setRate(speaker: string, rate: number) {
  const rates = await getRates();
  rates[speaker] = rate;
  await run('settings', 'readwrite', s => s.put(rates, 'rates'));
}
