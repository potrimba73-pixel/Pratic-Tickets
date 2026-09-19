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

export const TIERS = {
  free:    { nome: 'Free',    maxPanels: 1,   maxOptions: 5,  maxButtons: 3,  maxMsgs: 30,       watermark: true,  rating: false, autoClose: false },
  basico:  { nome: 'Básico',  maxPanels: 3,   maxOptions: 5,  maxButtons: 5,  maxMsgs: 70,       watermark: false, rating: false, autoClose: false },
  pro:     { nome: 'Pro',     maxPanels: 10,  maxOptions: 10, maxButtons: 10, maxMsgs: 150,      watermark: false, rating: true,  autoClose: true  },
  premium: { nome: 'Premium', maxPanels: 999, maxOptions: 10, maxButtons: 10, maxMsgs: Infinity, watermark: false, rating: true,  autoClose: true  }
};

export function getLimits(tier) {
  return TIERS[tier] || TIERS.free;
}
