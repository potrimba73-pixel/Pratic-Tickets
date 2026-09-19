import {
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, PermissionFlagsBits
} from 'discord.js';
import { getGuildConfig, updateGuildConfig, getLimits } from '../database/guildConfig.js';
import { resgatarChave, criarChave, listarChaves, revogarChave, registarVenda, estatisticasVendas } from '../database/keys.js';
import { createTicket, claimTicket, closeTicket, handleRating } from '../services/tickets.js';
import { enviarPosVenda } from '../services/keysManager.js';
import { t } from '../i18n.js';
import { enviarSetup, handleSetupInteraction } from '../services/setupWizard.js';

export async function handleInteraction(interaction, client) {
  try {
    // ============================================================
    // SETUP WIZARD (antes de tudo)
    // ============================================================
    if (interaction.customId?.startsWith('setup_')) {
      return handleSetupInteraction(interaction);
    }

    if (interaction.isChatInputCommand()) return handleCommand(interaction, client);
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('panel_')) {
      return createTicket(interaction, interaction.customId.replace('panel_', ''), interaction.values[0]);
    }
    if (interaction.isButton()) {
      const { customId } = interaction;
      if (customId.startsWith('claim_')) return claimTicket(interaction);
      if (customId.startsWith('close_')) return closeTicket(interaction);
      if (customId.startsWith('rate_')) return handleRating(interaction);
      if (customId.startsWith('notify_')) return notifyStaff(interaction);
      if (customId.startsWith('add_')) return addUser(interaction);
      if (customId.startsWith('priority_')) return togglePriority(interaction);
      if (customId.startsWith('lock_')) return toggleLock(interaction);
      if (customId.startsWith('rename_')) return renameTicket(interaction);
      if (customId.startsWith('pin_')) return pinTicket(interaction);
      if (customId.startsWith('export_')) return exportTicket(interaction);
      if (customId.startsWith('transfer_')) return transferTicket(interaction);
    }
    if (interaction.isModalSubmit()) return handleModal(interaction);
  } catch (e) {
    console.error(e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌', ephemeral: true }).catch(() => {});
    }
  }
}

async function notifyStaff(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const mentions = config.staffRoles.map(r => `<@&${r}>`).join(' ');
  await interaction.reply({ content: `🔔 ${mentions}`, ephemeral: false });
}

async function addUser(interaction) {
  const modal = new ModalBuilder().setCustomId(`addmodal_${interaction.channel.id}`).setTitle('➕');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('user_id').setLabel('ID').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  await interaction.showModal(modal);
}

async function togglePriority(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const ticket = config.tickets[interaction.channel.id];
  if (!ticket) return interaction.reply({ content: '❌', ephemeral: true });
  ticket.priority = !ticket.priority;
  await updateGuildConfig(interaction.guildId, { tickets: config.tickets });
  await interaction.reply({ content: `⚡ ${ticket.priority ? '✓' : '✗'}`, ephemeral: true });
}

async function toggleLock(interaction) {
  const everyone = interaction.guild.roles.everyone;
  const perms = interaction.channel.permissionsFor(everyone);
  const locked = perms && !perms.has(PermissionFlagsBits.SendMessages);
  await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: locked ? null : false });
  await interaction.reply({ content: `🔐`, ephemeral: true });
}

async function renameTicket(interaction) {
  const modal = new ModalBuilder().setCustomId(`renamemodal_${interaction.channel.id}`).setTitle('✏️');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('new_name').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
  ));
  await interaction.showModal(modal);
}

async function pinTicket(interaction) {
  const msgs = await interaction.channel.messages.fetch({ limit: 1 });
  const last = msgs.first();
  if (last) await last.pin().catch(() => {});
  await interaction.reply({ content: '📌', ephemeral: true });
}

async function exportTicket(interaction) {
  await interaction.reply({ content: '📄 Fecha o ticket para gerar transcript.', ephemeral: true });
}

async function transferTicket(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const staff = interaction.guild.members.cache.filter(m =>
    config.staffRoles.some(r => m.roles.cache.has(r)) && !m.user.bot && m.id !== interaction.user.id
  ).first(25);
  if (!staff.length) return interaction.reply({ content: '❌', ephemeral: true });

  const menu = new StringSelectMenuBuilder().setCustomId(`transfer_select_${interaction.channel.id}`).setPlaceholder('Transferir')
    .addOptions(staff.map(m => ({ label: m.displayName.slice(0, 100), value: m.id })));
  await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
}

async function handleCommand(interaction, client) {
  const { commandName } = interaction;
  const config = await getGuildConfig(interaction.guildId);
  const locale = config.locale || 'pt-PT';
  const limits = getLimits(config.tier);

if (commandName === 'setup') {
  return enviarSetup(interaction);
}
  // ---- /criar-cargos ----
  if (commandName === 'criar-cargos') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    }
    const { criarTodosCargos } = await import('../services/createRoles.js');
    return criarTodosCargos(interaction);
  }
  
  if (commandName === 'config') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'ver') {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(t(locale, 'config.title'))
          .addFields(
            { name: t(locale, 'config.plan'), value: limits.nome, inline: true },
            { name: t(locale, 'config.language'), value: locale, inline: true },
            { name: t(locale, 'config.logs'), value: config.logsChannelId ? `<#${config.logsChannelId}>` : '—', inline: true },
            { name: t(locale, 'config.transcripts'), value: config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : '—', inline: true },
            { name: t(locale, 'config.staff'), value: config.staffRoles.map(r => `<@&${r}>`).join(', ') || '—', inline: false },
            { name: 'Painéis', value: `${config.panels.length} / ${limits.maxPanels}`, inline: true }
          )
          .setColor('#5865f2')],
        ephemeral: true
      });
    }
    if (sub === 'logs') {
      const canal = interaction.options.getChannel('canal');
      await updateGuildConfig(interaction.guildId, { logsChannelId: canal.id });
      return interaction.reply({ content: `✅ <#${canal.id}>`, ephemeral: true });
    }
    if (sub === 'transcripts') {
      const canal = interaction.options.getChannel('canal');
      await updateGuildConfig(interaction.guildId, { transcriptChannelId: canal.id });
      return interaction.reply({ content: `✅ <#${canal.id}>`, ephemeral: true });
    }
    if (sub === 'staff') {
      const cargo = interaction.options.getRole('cargo');
      const roles = new Set(config.staffRoles); roles.add(cargo.id);
      await updateGuildConfig(interaction.guildId, { staffRoles: [...roles] });
      return interaction.reply({ content: `✅ <@&${cargo.id}>`, ephemeral: true });
    }
    if (sub === 'categoria') {
      const cat = interaction.options.getChannel('categoria');
      await updateGuildConfig(interaction.guildId, { categoryId: cat.id });
      return interaction.reply({ content: `✅ <#${cat.id}>`, ephemeral: true });
    }
    if (sub === 'idioma') {
      const loc = interaction.options.getString('locale');
      await updateGuildConfig(interaction.guildId, { locale: loc });
      return interaction.reply({ content: t(loc, 'config.languageSet'), ephemeral: true });
    }
  }

  if (commandName === 'painel') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'criar') {
      if (config.panels.length >= limits.maxPanels) {
        return interaction.reply({ content: `❌ ${limits.maxPanels}`, ephemeral: true });
      }
      const nome = interaction.options.getString('nome');
      const titulo = interaction.options.getString('titulo');
      const descricao = interaction.options.getString('descricao');
      const id = `p_${Date.now().toString(36)}`;
      config.panels.push({ id, nome, title: titulo, descricao, color: '#5865f2', options: [] });
      await updateGuildConfig(interaction.guildId, { panels: config.panels });
      return interaction.reply({ content: t(locale, 'panel.created', { id }), ephemeral: true });
    }
    if (sub === 'opcao') {
      const pid = interaction.options.getString('painel_id');
      const label = interaction.options.getString('label');
      const value = interaction.options.getString('value').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const panel = config.panels.find(p => p.id === pid);
      if (!panel) return interaction.reply({ content: '❌', ephemeral: true });
      if (panel.options.length >= limits.maxOptions) return interaction.reply({ content: `❌ ${limits.maxOptions}`, ephemeral: true });
      panel.options.push({ label, value });
      await updateGuildConfig(interaction.guildId, { panels: config.panels });
      return interaction.reply({ content: t(locale, 'panel.optionAdded', { n: panel.options.length, max: limits.maxOptions }), ephemeral: true });
    }
    if (sub === 'listar') {
      const txt = config.panels.map(p => `**${p.nome}** — \`${p.id}\` — ${p.options.length}`).join('\n') || t(locale, 'panel.listEmpty');
      return interaction.reply({ content: txt, ephemeral: true });
    }
    if (sub === 'enviar') {
      const pid = interaction.options.getString('painel_id');
      const canal = interaction.options.getChannel('canal');
      const panel = config.panels.find(p => p.id === pid);
      if (!panel || !panel.options.length) return interaction.reply({ content: '❌', ephemeral: true });

      const embed = new EmbedBuilder().setTitle(panel.title).setDescription(panel.descricao).setColor(panel.color || '#5865f2');
      if (limits.watermark) embed.setFooter({ text: 'Pratic Bot' });
      const select = new StringSelectMenuBuilder().setCustomId(`panel_${panel.id}`)
        .setPlaceholder(t(locale, 'panel.placeholder'))
        .addOptions(panel.options.slice(0, 10).map(o => ({ label: o.label.slice(0, 100), value: o.value.slice(0, 100) })));
      await canal.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
      return interaction.reply({ content: t(locale, 'panel.sent', { channel: `<#${canal.id}>` }), ephemeral: true });
    }
    if (sub === 'apagar') {
      const pid = interaction.options.getString('painel_id');
      config.panels = config.panels.filter(p => p.id !== pid);
      await updateGuildConfig(interaction.guildId, { panels: config.panels });
      return interaction.reply({ content: t(locale, 'panel.deleted'), ephemeral: true });
    }
  }

  if (commandName === 'premium') {
    const chave = interaction.options.getString('chave');
    const res = await resgatarChave(chave, interaction.guildId, interaction.user.id);
    if (!res.ok) return interaction.reply({ content: res.error === 'invalid' ? t(locale, 'premium.invalid') : t(locale, 'premium.used'), ephemeral: true });
    await updateGuildConfig(interaction.guildId, { tier: res.tier, premiumUntil: res.expiraEm });
    const valor = { basico: 5, pro: 10, premium: 20 }[res.tier] || 0;
    await registarVenda({ chave: chave.toUpperCase(), tier: res.tier, guildId: interaction.guildId, guildNome: interaction.guild.name, userId: interaction.user.id, valor });
    await enviarPosVenda(interaction, res.tier, res.expiraEm);
    const l2 = getLimits(res.tier);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⭐').setDescription(t(locale, 'premium.activated', { plan: l2.nome, date: `<t:${Math.floor(res.expiraEm.getTime()/1000)}:R>` })).setColor('#FFD700')] });
  }

  if (commandName === 'gerar-chave') {
    if (interaction.user.id !== process.env.ADMIN_KEY) return interaction.reply({ content: t(locale, 'common.ownerOnly'), ephemeral: true });
    const tier = interaction.options.getString('tier');
    const dias = interaction.options.getInteger('dias') || 30;
    const chave = await criarChave(tier, dias);
    return interaction.reply({ content: `\`\`\`${chave}\`\`\``, ephemeral: true });
  }

  if (commandName === 'admin-chaves') {
    if (interaction.user.id !== process.env.ADMIN_KEY) return interaction.reply({ content: '❌', ephemeral: true });
    const sub = interaction.options.getSubcommand();
    if (sub === 'stats') {
      const e = await estatisticasVendas();
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📊').addFields(
        { name: 'Vendas', value: `${e.totalVendas}`, inline: true },
        { name: 'Receita', value: `€${e.totalEuros.toFixed(2)}`, inline: true },
        { name: 'Ativos', value: `${e.clientesAtivos}`, inline: true },
        { name: 'MRR', value: `€${e.recorrente}/mês`, inline: true }
      ).setColor('#57f287')], ephemeral: true });
    }
    if (sub === 'listar') {
      const chaves = await listarChaves();
      return interaction.reply({ content: chaves.map(k => `\`${k.chave}\` **${k.tier}** ${k.usada ? '✅' : '⏳'}`).join('\n') || '—', ephemeral: true });
    }
    if (sub === 'revogar') {
      const c = interaction.options.getString('chave');
      const ok = await revogarChave(c);
      return interaction.reply({ content: ok ? '✅' : '❌', ephemeral: true });
    }
  }
}

async function handleModal(interaction) {
  const { customId } = interaction;
  if (customId.startsWith('addmodal_')) {
    const channelId = customId.replace('addmodal_', '');
    const userId = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '');
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) return interaction.reply({ content: '❌', ephemeral: true });
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) {
      await channel.permissionOverwrites.edit(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await channel.send(`➕ <@${member.id}>`);
    }
    return interaction.reply({ content: '✅', ephemeral: true });
  }
  if (customId.startsWith('renamemodal_')) {
    const channelId = customId.replace('renamemodal_', '');
    const nome = interaction.fields.getTextInputValue('new_name').slice(0, 50);
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) await channel.setName(nome).catch(() => {});
    return interaction.reply({ content: '✅', ephemeral: true });
  }
}
