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
    branding: {
      botName: null,
      avatarUrl: null,
      bannerUrl: null,
      description: null,
      color: '#5865f2',
      status: null
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
// 🎯 PLANOS — €0 / €5 / €12 / €15 / €20
// ============================================================
export const TIERS = {
  free: {
    nome: 'Free', preco: 0,
    maxPanels: 8, maxOptions: 4, maxButtons: 4, maxMsgs: 990,
    watermark: false, rating: true, autoClose: false, branding: false,
    claim: true, reabrir: true, embeds: true
  },
  basico: {
    nome: 'Básico', preco: 5,
    maxPanels: 20, maxOptions: 10, maxButtons: 10, maxMsgs: 2990,
    watermark: false, rating: true, autoClose: false, branding: false,
    claim: true, forms: true, dmBasica: true, lembretes: true,
    statsBasicas: true, respostasRapidas: true
  },
  pro: {
    nome: 'Pro', preco: 12,
    maxPanels: 50, maxOptions: 10, maxButtons: 10, maxMsgs: 9990,
    watermark: false, rating: true, autoClose: true, branding: true,
    claim: true, forms: true, formsAvancados: true,
    dmAuto: true, transfer: true, statsAvancadas: true,
    rankingStaff: true, horarioSuporte: true, webhooks: true,
    respostasRapidasAvancadas: true
  },
  premium: {
    nome: 'Premium', preco: 15,
    maxPanels: 999, maxOptions: 10, maxButtons: 10, maxMsgs: Infinity,
    watermark: false, rating: true, autoClose: true, branding: true,
    whiteLabel: true,
    claim: true, forms: true, formsAvancados: true,
    dmAuto: true, transfer: true, statsAvancadas: true,
    rankingStaff: true, horarioSuporte: true, webhooks: true,
    respostasRapidasAvancadas: true
  },
  custom: {
    nome: 'Custom', preco: 20,
    maxPanels: 999, maxOptions: 10, maxButtons: 10, maxMsgs: Infinity,
    watermark: false, rating: true, autoClose: true, branding: true,
    whiteLabel: true, customBot: true, suportePrioritario: true,
    claim: true, forms: true, formsAvancados: true,
    dmAuto: true, transfer: true, statsAvancadas: true,
    rankingStaff: true, horarioSuporte: true, webhooks: true,
    respostasRapidasAvancadas: true
  }
};

export function getLimits(tier) {
  return TIERS[tier] || TIERS.free;
}
