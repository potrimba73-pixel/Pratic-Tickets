import { getDB } from '../database/mongo.js';
import { EmbedBuilder } from 'discord.js';
import { updateGuildConfig } from '../database/guildConfig.js';

export function iniciarVerificacaoExpiracao(client) {
  setInterval(async () => {
    try {
      const agora = new Date();
      const expirados = await getDB().collection('guilds').find({
        premiumUntil: { $lt: agora }, tier: { $ne: 'free' }
      }).toArray();

      for (const g of expirados) {
        await updateGuildConfig(g.guildId, { tier: 'free', premiumUntil: null });
        const guild = client.guilds.cache.get(g.guildId);
        if (!guild) continue;
        try {
          const owner = await guild.fetchOwner();
          await owner.send({ embeds: [new EmbedBuilder().setTitle('⏰ Plano expirou').setDescription(`${guild.name} → Free.`).setColor('#faa61a')] }).catch(() => {});
        } catch {}
      }
    } catch (e) { console.error(e); }
  }, 3600000);
}

export async function enviarPosVenda(interaction, tier, expiraEm) {
  const planos = {
  basico:  { nome: 'Básico',  preco: '€5',  features: ['15 painéis','5 opções','5 botões','90 msgs','Sem marca'] },
  pro:     { nome: 'Pro',     preco: '€10', features: ['20 painéis','10 opções','10 botões','200 msgs','Avaliações','Auto-fecho','🎨 Branding'] },
  premium: { nome: 'Premium', preco: '€15', features: ['Ilimitado','10 opções','10 botões','∞ msgs','White-label','🎨 Branding total'] }
};
  const p = planos[tier];
  if (!p) return;

  const embed = new EmbedBuilder()
    .setTitle(`⭐ Plano ${p.nome} ativado!`)
    .setDescription(
      `**${p.preco}/mês**\n**Expira:** <t:${Math.floor(expiraEm.getTime()/1000)}:R>\n\n` +
      p.features.map(f => `✅ ${f}`).join('\n') +
      `\n\n**Próximos passos:**\n1. \`/setup\`\n2. \`/painel criar\`\n3. \`/painel enviar\``
    )
    .setColor('#57f287')
    .setTimestamp();

  try { await interaction.user.send({ embeds: [embed] }); }
  catch { await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {}); }
}
