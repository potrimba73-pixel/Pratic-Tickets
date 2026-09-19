import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'locales');
const cache = new Map();

export const SUPPORTED = ['pt-PT', 'pt-BR', 'es-ES', 'ru', 'en'];

export function loadLocale(locale) {
  if (cache.has(locale)) return cache.get(locale);
  const file = path.join(localesDir, `${locale}.json`);
  if (!fs.existsSync(file)) return loadLocale('pt-PT');
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  cache.set(locale, data);
  return data;
}

export function t(locale, key, vars = {}) {
  const data = loadLocale(locale);
  const parts = key.split('.');
  let value = data;
  for (const p of parts) {
    value = value?.[p];
    if (value === undefined) break;
  }
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
