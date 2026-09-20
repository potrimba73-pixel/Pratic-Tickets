import { getDB } from './mongo.js';

const cache = new Map();
const TTL = 30_000;

function defaultConfig(guildId) {
  return {
    guildId,
    tier: 'free',
    premiumUntil: null,
    locale: 'pt-PT',
    logsChannelId: null,
    transcriptChannelId: null,
    staffRoles: [],
    categoryId: null,
    panels: [],
    tickets: {},
    autoCloseHours: 48,
    // 🎨 NOVO: identidade visual por servidor (Pro / Premium)
    branding: {
      botName: null,      // ex: "🎫 Suporte Alpha"
      avatarUrl: null,    // ícone que aparece no autor do embed
      bannerUrl: null,    // imagem grande (setImage)
      description: null,  // texto curto que aparece em DMs
      color: '#5865f2',   // cor dos embeds
      status: null        // texto de presença sugerido (rotação)
    },
    createdAt: new Date()
  };
}

export async function getGuildConfig(guildId) {
  const c = cache.get(guildId);
  if (c && Date.now() - c.ts < TTL) return c.data;

  const col = getDB().collection('guilds');
  let config = await col.findOne({ guildId });
  if (!config) {
    config = defaultConfig(guildId);
    await col.insertOne(config);
  } else if (!config.branding) {
    // migração automática de guilds antigas
    config.branding = defaultConfig(guildId).branding;
    await col.updateOne({ guildId }, { $set: { branding: config.branding } });
  }

  if (config.premiumUntil && new Date(config.premiumUntil) < new Date()) {
    config.tier = 'free';
    config.premiumUntil = null;
    await col.updateOne({ guildId }, { $set: { tier: 'free', premiumUntil: null } });
  }

  cache.set(guildId, { data: config, ts: Date.now() });
  return config;
}

export async function updateGuildConfig(guildId, updates) {
  const col = getDB().collection('guilds');
  await col.updateOne({ guildId }, { $set: updates }, { upsert: true });
  cache.delete(guildId);
  return getGuildConfig(guildId);
}

// ============================================================
// 🎯 PLANOS — tabela única, tudo lê daqui
// ============================================================
export const TIERS = {
  free:    { nome: 'Free',    preco: 0,  maxPanels: 6,   maxOptions: 3,  maxButtons: 3,  maxMsgs: 70,       watermark: true,  rating: false, autoClose: false, branding: false },
  basico:  { nome: 'Básico',  preco: 5,  maxPanels: 15,  maxOptions: 5,  maxButtons: 5,  maxMsgs: 90,       watermark: false, rating: false, autoClose: false, branding: false },
  pro:     { nome: 'Pro',     preco: 10, maxPanels: 20,  maxOptions: 10, maxButtons: 10, maxMsgs: 200,      watermark: false, rating: true,  autoClose: true,  branding: true },
  premium: { nome: 'Premium', preco: 15, maxPanels: 999, maxOptions: 10, maxButtons: 10, maxMsgs: Infinity, watermark: false, rating: true,  autoClose: true,  branding: true }
};

export function getLimits(tier) {
  return TIERS[tier] || TIERS.free;
}
