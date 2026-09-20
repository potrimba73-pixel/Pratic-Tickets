// src/utils/errorTracker.js
// Sistema de correlation ID — cada erro ganha um código curto pesquisável.

const cache = new Map(); // id -> entry
const MAX = 200;         // mantém só os últimos 200 erros em memória

// Alfabeto sem 0/O/1/I/L para evitar confusão ao ler
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function gerarErrorId() {
  let s = 'ERR-';
  for (let i = 0; i < 5; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

export function registarErro(id, err, ctx = {}) {
  const entry = {
    id,
    message: err?.message || String(err),
    code: err?.code || null,
    stack: err?.stack || null,
    rawError: err?.rawError || null,
    ctx,
    ts: new Date()
  };

  cache.set(id, entry);

  // Limpar os mais antigos
  if (cache.size > MAX) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }

  // Log formatado no terminal — fácil de grep
  console.error(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.error(`🚨 [${id}] ${entry.message}`);
  if (entry.code) console.error(`   code: ${entry.code}`);
  console.error(`   user:    ${ctx.userTag || ctx.user || '—'} (${ctx.user || '—'})`);
  console.error(`   guild:   ${ctx.guildName || '—'} (${ctx.guildId || '—'})`);
  console.error(`   channel: ${ctx.channelId || '—'}`);
  console.error(`   tipo:    ${ctx.type || '—'} | cmd: ${ctx.command || '—'} | customId: ${ctx.customId || '—'}`);
  if (entry.stack) console.error(`\n${entry.stack}`);
  console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  return entry;
}

export function obterErro(id) {
  if (!id) return null;
  return cache.get(id.toUpperCase()) || null;
}

export function listarRecentes(n = 10) {
  return [...cache.values()].sort((a, b) => b.ts - a.ts).slice(0, n);
}

export function limparCache() {
  cache.clear();
}
