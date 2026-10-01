// src/utils/safeInteraction.js
// Wrappers que ignoram erros de interação expirada/duplicada.

const IGNORAR = new Set([10062, 40060]);

async function wrapper(fn, interaction, payload, label) {
  try {
    return await fn(payload);
  } catch (e) {
    if (IGNORAR.has(e?.code)) {
      console.warn(`⚠️ [${label}] interaction ignorada (code ${e.code})`);
      return null;
    }
    throw e;
  }
}

export function safeUpdate(interaction, payload) {
  const fn = (interaction.replied || interaction.deferred)
    ? interaction.editReply.bind(interaction)
    : interaction.update.bind(interaction);
  return wrapper(fn, interaction, payload, 'update');
}

export function safeReply(interaction, payload) {
  const fn = (interaction.replied || interaction.deferred)
    ? interaction.followUp.bind(interaction)
    : interaction.reply.bind(interaction);
  return wrapper(fn, interaction, payload, 'reply');
}

export function safeDeferUpdate(interaction) {
  return wrapper(() => interaction.deferUpdate(), interaction, undefined, 'deferUpdate');
}

export function safeDefer(interaction, opts = { ephemeral: true }) {
  return wrapper(() => interaction.deferReply(opts), interaction, undefined, 'deferReply');
}
