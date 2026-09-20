// src/services/keysManager.js
import { getDB } from '../database/mongo.js';
import { EmbedBuilder } from 'discord.js';
import { getGuildConfig, updateGuildConfig, getLimits } from '../database/guildConfig.js';
import { resgatarChave, registarVenda } from '../database/keys.js';
import { BRAND, EMOJI, footer } from '../ui/theme.js';

// ============================================================
// ⏰ VERIFICAÇÃO DE EXPIRAÇÃO (corre a cada hora)
// ============================================================
export function iniciarVerificacaoExpiracao(client) {
  setInterval(async () => {
    try {
      const agora = new Date();
      const expirados = await getDB().collection('guilds').find({
        premiumUntil: { $lt: agora },
        tier: { $ne: 'free' }
      }).toArray();

      for (const g of expirados) {
        await updateGuildConfig(g.guildId, { tier: 'free', premiumUntil: null });
        const guild = client.guilds.cache.get(g.guildId);
        if (!guild) continue;
        try {
          const owner = await guild.fetchOwner();
          await owner.send({
            embeds: [new EmbedBuilder()
              .setTitle('⏰ Plano expirou')
              .setDescription(`${guild.name} → Free.`)
              .setColor(BRAND.warning)]
          }).catch(() => {});
        } catch {}
      }
    } catch (e) { console.error(e); }
  }, 3600000); // 1 hora
}

// ============================================================
// 📩 PÓS-VENDA (DM ao ativar plano)
// ============================================================
export async function enviarPosVenda(interaction, tier, expiraEm) {
  const planos = {
    basico:  { nome: 'Básico',  preco: '€5',  features: ['15 painéis','5 opções','5 botões','90 msgs','Sem marca'] },
    pro:     { nome: 'Pro',     preco: '€10', features: ['20 painéis','10 opções','10 botões','200 msgs','Avaliações','Auto-fecho','🎨 Branding'] },
    premium: { nome: 'Premium', preco: '€15', features: ['Ilimitado','10 opções','10 botões','∞ msgs','White-label','🎨 Branding total'] }
  };
  const p = planos[tier];
  if (!p) return;

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.premium} Plano ${p.nome} ativado!`)
    .setDescription(
      `**${p.preco}/mês**\n**Expira:** <t:${Math.floor(expiraEm.getTime()/1000)}:R>\n\n` +
      p.features.map(f => `✅ ${f}`).join('\n') +
      `\n\n**Próximos passos:**\n1. \`/pratic\`\n2. Configura no painel\n3. Cria os teus painéis`
    )
    .setColor(BRAND.success)
    .setFooter(footer())
    .setTimestamp();

  try { await interaction.user.send({ embeds: [embed] }); }
  catch { await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {}); }
}

// ============================================================
// 🔑 PROCESSAR CHAVE VIA MODAL (chamado pelo setupWizard)
// ============================================================
export async function processarChaveModal(interaction) {
  const chave = interaction.fields.getTextInputValue('chave').trim();
  const res = await resgatarChave(chave, interaction.guildId, interaction.user.id);

  if (!res.ok) {
    return interaction.reply({
      content: `${EMOJI.error} ${res.error === 'invalid' ? 'Chave inválida.' : 'Chave já usada.'}`,
      ephemeral: true
    });
  }

  await updateGuildConfig(interaction.guildId, { tier: res.tier, premiumUntil: res.expiraEm });

  const valor = { basico: 5, pro: 10, premium: 15 }[res.tier] || 0;
  await registarVenda({
    chave: chave.toUpperCase(),
    tier: res.tier,
    guildId: interaction.guildId,
    guildNome: interaction.guild.name,
    userId: interaction.user.id,
    valor
  });

  const lim = getLimits(res.tier);
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.premium} Plano ${lim.nome} ativado!`)
    .setDescription(
      `**€${lim.preco}/mês** · expira <t:${Math.floor(res.expiraEm.getTime()/1000)}:R>\n\n` +
      `**Novidades desbloqueadas:**\n` +
      `> ${EMOJI.panel} Painéis: **${lim.maxPanels === 999 ? '∞' : lim.maxPanels}**\n` +
      `> ${EMOJI.transcripts} Msgs/transcript: **${lim.maxMsgs === Infinity ? '∞' : lim.maxMsgs}**\n` +
      (lim.rating    ? `> ${EMOJI.star} Avaliações ativas\n` : '') +
      (lim.autoClose ? `> ${EMOJI.clock} Auto-fecho ativo\n` : '') +
      (lim.branding  ? `> 🎨 **Branding personalizado** — vai a 🎨 no painel\n` : '')
    )
    .setColor(BRAND.success)
    .setFooter(footer())
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
