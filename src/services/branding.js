// src/services/branding.js
import { BRAND } from '../ui/theme.js';

const BRANDING_TIERS = new Set(['pro', 'premium']);

export function temBranding(config) {
  return BRANDING_TIERS.has(config?.tier);
}

export function nomeBot(config) {
  return temBranding(config) && config.branding?.botName
    ? config.branding.botName
    : BRAND.name;
}

export function corBot(config) {
  return temBranding(config) && config.branding?.color
    ? config.branding.color
    : BRAND.color;
}

/**
 * Aplica a identidade da guild a um embed.
 * - Pro/Premium com botName definido → usa esse nome + avatar no autor
 * - Todos os outros → usa "Pratic Bot" default
 * - Banner (setImage) só aparece se definido e tiver branding ativo
 */
export function aplicarBranding(embed, config, opts = {}) {
  const b = config?.branding || {};
  const ativo = temBranding(config);

  if (opts.author !== false) {
    embed.setAuthor({
      name: ativo && b.botName ? b.botName : BRAND.name,
      iconURL: ativo && b.avatarUrl ? b.avatarUrl : undefined
    });
  }

  if (ativo && b.bannerUrl && opts.banner !== false) {
    embed.setImage(b.bannerUrl);
  }

  if (ativo && b.color) {
    embed.setColor(b.color);
  } else if (opts.color) {
    embed.setColor(opts.color);
  }

  return embed;
}

/**
 * Bloco de rodapé que aparece em DMs, para o utilizador saber
 * de que comunidade veio a mensagem.
 */
export function rodapeDM(config) {
  if (!temBranding(config)) return null;
  const desc = config.branding?.description;
  const nome = config.branding?.botName;
  if (!nome && !desc) return null;
  return { nome, desc };
}
