// src/ui/theme.js
export const BRAND = {
  name: 'Pratic Bot',
  color: 0x5865f2,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  gold: 0xffd700,
  neutral: 0x2b2d31,
  purple: 0x9b59b6,
  blue: 0x5dade2
};

export const EMOJI = {
  setup: '⚙️',
  logs: '📝',
  transcripts: '📄',
  staff: '🛡️',
  category: '📁',
  language: '🌐',
  panel: '🎫',
  panels: '🗂️',
  test: '🧪',
  help: '❓',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  back: '↩️',
  save: '💾',
  premium: '⭐',
  stats: '📊',
  refresh: '🔄',
  add: '➕',
  trash: '🗑️',
  info: 'ℹ️',
  sparkle: '✨',
  rocket: '🚀',
  clock: '⏰',
  star: '⭐',
  arrow: '➜'
};

export function footer(extra = '') {
  return { text: extra ? `${BRAND.name} • ${extra}` : BRAND.name };
}

export function withColor(embed, type = 'color') {
  return embed.setColor(BRAND[type] ?? BRAND.color);
}
