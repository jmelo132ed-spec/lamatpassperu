import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BinLookupResult } from './binLookup';

export type BinLookupLogEntry = {
  id: string;
  at: string;
  bin: string;
  found: boolean;
  level: string;
  bank: string;
  country: string;
};

const MAX_ENTRIES = 300;
const filePath = path.join(process.cwd(), '.data', 'bin-lookups.json');

export async function readBinLookups(): Promise<BinLookupLogEntry[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function recordBinLookup(bin: string, result: BinLookupResult | null) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const list = await readBinLookups();
  const entry: BinLookupLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    bin,
    found: Boolean(result),
    level: result?.level || '',
    bank: result?.bank || '',
    country: result?.country || '',
  };
  list.unshift(entry);
  await writeFile(filePath, JSON.stringify(list.slice(0, MAX_ENTRIES), null, 2), 'utf8');
  return entry;
}
