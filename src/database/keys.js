import { getDB } from './mongo.js';
import { randomBytes } from 'crypto';

export function gerarChave(tier) {
  const prefixo = tier.toUpperCase().slice(0, 3);
  const a = randomBytes(4).toString('hex').toUpperCase();
  const b = randomBytes(4).toString('hex').toUpperCase();
  return `${prefixo}-${a}-${b}`;
}

export async function criarChave(tier, dias = 30, notas = '') {
  const col = getDB().collection('keys');
  const chave = gerarChave(tier);
  await col.insertOne({
    chave, tier, dias, notas,
    usada: false, usadaPor: null, guildId: null,
    criadaEm: new Date(), expiraEm: null
  });
  return chave;
}

export async function resgatarChave(chave, guildId, userId) {
  const col = getDB().collection('keys');
  const key = await col.findOne({ chave: chave.toUpperCase() });
  if (!key) return { ok: false, error: 'invalid' };
  if (key.usada || key.revogada) return { ok: false, error: 'used' };

  const expiraEm = new Date(Date.now() + key.dias * 86400000);
  await col.updateOne(
    { chave: key.chave },
    { $set: { usada: true, usadaPor: userId, guildId, usadaEm: new Date(), expiraEm } }
  );
  return { ok: true, tier: key.tier, expiraEm };
}

export async function listarChaves() {
  return getDB().collection('keys').find({}).sort({ criadaEm: -1 }).limit(50).toArray();
}

export async function revogarChave(chave) {
  const r = await getDB().collection('keys').updateOne(
    { chave: chave.toUpperCase() },
    { $set: { revogada: true } }
  );
  return r.modifiedCount > 0;
}

export async function registarVenda({ chave, tier, guildId, guildNome, userId, valor }) {
  await getDB().collection('vendas').insertOne({
    chave, tier, guildId, guildNome, userId, valor, data: new Date()
  });
}

export async function estatisticasVendas() {
  const vendas = await getDB().collection('vendas').find({}).toArray();
  const total = vendas.reduce((s, v) => s + (v.valor || 0), 0);
  const porTier = {};
  for (const v of vendas) porTier[v.tier] = (porTier[v.tier] || 0) + 1;
  const guilds = await getDB().collection('guilds').find({ tier: { $ne: 'free' } }).toArray();
  const precos = { basico: 5, pro: 10, premium: 20 };
  const recorrente = guilds.reduce((s, g) => s + (precos[g.tier] || 0), 0);
  return { totalVendas: vendas.length, totalEuros: total, porTier, clientesAtivos: guilds.length, recorrente };
}
