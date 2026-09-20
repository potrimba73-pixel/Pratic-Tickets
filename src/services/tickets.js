// src/services/tickets.js
import {
  ChannelType, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} from 'discord.js';
import { getGuildConfig, updateGuildConfig, getLimits } from '../database/guildConfig.js';
import { gerarTranscript } from './transcript.js';
import { aplicarBranding, nomeBot } from './branding.js';
import { t } from '../i18n.js';

function botoes(ticketId, limits, locale, tier) {
  const b = [
    new ButtonBuilder().setCustomId(`claim_${ticketId}`).setLabel(t(locale, 'ticket.claim')).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`close_${ticketId}`).setLabel(t(locale, 'ticket.close')).setStyle(ButtonStyle.Danger)
  ];
  if (limits.maxButtons >= 5) {
    b.push(
      new ButtonBuilder().setCustomId(`notify_${ticketId}`).setLabel(t(locale, 'ticket.notify')).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`add_${ticketId}`).setLabel(t(locale, 'ticket.add')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`priority_${ticketId}`).setLabel(t(locale, 'ticket.priority')).setStyle(ButtonStyle.Secondary)
    );
  }
  if (limits.maxButtons >= 10) {
    b.push(
      new ButtonBuilder().setCustomId(`lock_${ticketId}`).setLabel(t(locale, 'ticket.lock')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rename_${ticketId}`).setLabel(t(locale, 'ticket.rename')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`pin_${ticketId}`).setLabel(t(locale, 'ticket.pin')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`export_${ticketId}`).setLabel(t(locale, 'ticket.export')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`transfer_${ticketId}`).setLabel(t(locale, 'ticket.transfer')).setStyle(ButtonStyle.Secondary)
    );
  }
  const rows = [];
  for (let i = 0; i < b.length; i += 5) rows.push(new ActionRowBuilder().addComponents(b.slice(i, i + 5)));
  return rows;
}

export async function createTicket(interaction, panelId, optionValue) {
  const { guild, user } = interaction;
  const config = await getGuildConfig(guild.id);
  const limits = getLimits(config.tier);
  const locale = config.locale || 'pt-PT';

  const panel = config.panels.find(p => p.id === panelId);
  if (!panel) return interaction.reply({ content: t(locale, 'common.error'), ephemeral: true });

  const existente = Object.entries(config.tickets).find(([, tk]) => tk.userId === user.id && !tk.closed);
  if (existente) {
    return interaction.reply({ content: t(locale, 'ticket.alreadyOpen', { channel: `<#${existente[0]}>` }), ephemeral: true });
  }

  const option = panel.options.find(o => o.value === optionValue);

  // 🛡️ VERIFICAR PERMISSÕES DO BOT ANTES DE TENTAR CRIAR
  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content: `❌ O bot precisa da permissão **Gerir Canais** para criar tickets.\n> Pede a um admin para dar essa permissão ao cargo do bot.`,
      ephemeral: true
    });
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30),
      type: ChannelType.GuildText,
      parent: config.categoryId || null,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        ...config.staffRoles.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }))
      ]
    });
  } catch (e) {
    console.error(e);
    return interaction.reply({
      content: `❌ Não consegui criar o ticket (permissões em falta).\n> **Bot precisa de:** Gerir Canais, Ver Canais, Enviar Mensagens.`,
      ephemeral: true
    });
  }

  config.tickets[channel.id] = {
    userId: user.id, username: user.username,
    panelId, option: optionValue, optionLabel: option?.label || optionValue,
    openedAt: new Date().toISOString(), lastActivity: new Date().toISOString(),
    claimedBy: null, claimedByName: null, closed: false, rating: null
  };
  await updateGuildConfig(guild.id, { tickets: config.tickets });

  const embed = new EmbedBuilder()
    .setTitle(`🎫 ${panel.title}`)
    .setDescription(
      `<@${user.id}>\n\n**${option?.label || optionValue}**\n` +
      `⏳ ${t(locale, 'ticket.waiting')}\n<t:${Math.floor(Date.now()/1000)}:R>`
    )
    .setTimestamp();

  // 🎨 APLICAR BRANDING (nome, avatar, cor) se o plano permitir
  aplicarBranding(embed, config, { color: panel.color || '#5865f2' });
  if (limits.watermark) embed.setFooter({ text: nomeBot(config) });

  await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: botoes(channel.id, limits, locale, config.tier) });
  return interaction.reply({ content: t(locale, 'ticket.created', { channel: `<#${channel.id}>` }), ephemeral: true });
}

export async function claimTicket(interaction) {
  const { guild, member, channel } = interaction;
  const config = await getGuildConfig(guild.id);
  const locale = config.locale || 'pt-PT';
  const ticket = config.tickets[channel.id];
  if (!ticket || ticket.closed) return interaction.reply({ content: t(locale, 'common.error'), ephemeral: true });
  if (ticket.claimedBy) return interaction.reply({ content: '❌ Já foi assumido.', ephemeral: true });

  if (config.staffRoles.length && !member.roles.cache.some(r => config.staffRoles.includes(r.id)) && !member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: t(locale, 'common.staffOnly'), ephemeral: true });
  }

  ticket.claimedBy = member.id;
  ticket.claimedByName = member.displayName;
  ticket.lastActivity = new Date().toISOString();
  await updateGuildConfig(guild.id, { tickets: config.tickets });

  const limits = getLimits(config.tier);
  const embed = new EmbedBuilder()
    .setTitle(`🎫 ${ticket.optionLabel}`)
    .setDescription(`<@${ticket.userId}>\n\n**${ticket.optionLabel}**\n${t(locale, 'ticket.claimed', { staff: `<@${member.id}>` })}`)
    .setTimestamp();

  aplicarBranding(embed, config, { color: '#57f287' });
  if (limits.watermark) embed.setFooter({ text: nomeBot(config) });

  await interaction.update({ embeds: [embed] });
}

export async function closeTicket(interaction) {
  const { guild, member, channel } = interaction;
  const config = await getGuildConfig(guild.id);
  const limits = getLimits(config.tier);
  const locale = config.locale || 'pt-PT';
  const ticket = config.tickets[channel.id];
  if (!ticket || ticket.closed) return interaction.reply({ content: t(locale, 'common.error'), ephemeral: true });

  if (config.staffRoles.length && !member.roles.cache.some(r => config.staffRoles.includes(r.id)) && !member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: t(locale, 'common.staffOnly'), ephemeral: true });
  }

  await interaction.reply({ content: '🔒 A fechar...', ephemeral: true });

  ticket.closed = true;
  ticket.closedAt = new Date().toISOString();
  ticket.closedBy = member.id;
  ticket.closedByName = member.displayName;
  await updateGuildConfig(guild.id, { tickets: config.tickets });

  if (config.transcriptChannelId) {
    try {
      const result = await gerarTranscript(channel, ticket, config);
      const transChannel = await guild.channels.fetch(config.transcriptChannelId).catch(() => null);
      if (transChannel) {
        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'transcript.title'))
          .setDescription(`**${channel.name}**\n<@${ticket.userId}>\n<@${member.id}>\n${ticket.optionLabel}\n${result.exportadas} / ${result.totalReal}${result.cortado ? ' ⚠️' : ''}`)
          .setTimestamp();

        aplicarBranding(embed, config, { color: result.cortado ? '#faa61a' : '#8b0000' });
        if (limits.watermark) embed.setFooter({ text: nomeBot(config) });

        if (result.cortado) {
          const p = { free: { n:'Básico', p:'€5', m:90 }, basico: { n:'Pro', p:'€10', m:200 }, pro: { n:'Premium', p:'€15', m:'∞' } }[config.tier];
          embed.addFields({ name: '⚠️', value: `${result.totalReal} → ${limits.maxMsgs}. +${p.n} (${p.p}) → ${p.m}` });
        }
        await transChannel.send({ embeds: [embed], files: [result.attachment, result.txtAttachment] });
      }
    } catch (e) { console.error(e); }
  }

  if (limits.rating) {
    try {
      const user = await guild.client.users.fetch(ticket.userId);
      const row = new ActionRowBuilder().addComponents(
        [1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`rate_${channel.id}_${n}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Secondary))
      );

      const dmEmbed = new EmbedBuilder()
        .setTitle(t(locale, 'rating.title'))
        .setDescription(`Ticket **${ticket.optionLabel}** em **${guild.name}**`)
        .setTimestamp();

      // 🎨 BRANDING NA DM — para o user saber de que comunidade veio
      aplicarBranding(dmEmbed, config, { color: '#FFD700' });
      const desc = config.branding?.description;
      if (desc && config.tier !== 'free') {
        dmEmbed.setFooter({ text: `${nomeBot(config)} • ${desc}` });
      }

      await user.send({ embeds: [dmEmbed], components: [row] }).catch(() => {});
    } catch {}
  }

  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

export async function handleRating(interaction) {
  const [, channelId, stars] = interaction.customId.split('_');
  const config = await getGuildConfig(interaction.guildId || interaction.guild?.id);
  const locale = config.locale || 'pt-PT';
  const ticket = config.tickets[channelId];
  if (!ticket || ticket.rating) return interaction.reply({ content: '❌', ephemeral: true });

  ticket.rating = parseInt(stars);
  await updateGuildConfig(config.guildId, { tickets: config.tickets });
  await interaction.update({ content: t(locale, 'rating.thanks', { n: stars }), embeds: [], components: [] });
}
