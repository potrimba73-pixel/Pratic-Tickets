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
import { aplicarBranding } from '../services/branding.js';
import { gerarErrorId, registarErro, obterErro, listarRecentes } from '../utils/errorTracker.js';

export async function handleInteraction(interaction, client) {
  try {
    // ============================================================
    // 🎯 SETUP WIZARD — apanha TODOS os customIds "setup_*"
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

      // 🎯 Botões de painel (formato: panelbtn|panelId|value)
      if (customId.startsWith('panelbtn|')) {
        const [, panelId, optionValue] = customId.split('|');
        return createTicket(interaction, panelId, optionValue);
      }

      if (customId.startsWith('claim_'))    return claimTicket(interaction);
      if (customId.startsWith('close_'))    return closeTicket(interaction);
      if (customId.startsWith('rate_'))     return handleRating(interaction);
      if (customId.startsWith('notify_'))   return notifyStaff(interaction);
      if (customId.startsWith('add_'))      return addUser(interaction);
      if (customId.startsWith('priority_')) return togglePriority(interaction);
      if (customId.startsWith('lock_'))     return toggleLock(interaction);
      if (customId.startsWith('rename_'))   return renameTicket(interaction);
      if (customId.startsWith('pin_'))      return pinTicket(interaction);
      if (customId.startsWith('export_'))   return exportTicket(interaction);
      if (customId.startsWith('transfer_')) return transferTicket(interaction);
    }

    if (interaction.isModalSubmit()) return handleModal(interaction);
  } catch (e) {
    // ============================================================
    // 🚨 ERROR TRACKER — correlation ID
    // ============================================================
    const id = gerarErrorId();
    registarErro(id, e, {
      user: interaction.user?.id,
      userTag: interaction.user?.tag,
      guildId: interaction.guildId,
      guildName: interaction.guild?.name,
      channelId: interaction.channelId,
      type: interaction.type,
      command: interaction.commandName || null,
      customId: interaction.customId || null
    });

    const msg =
      `❌ Ocorreu um erro inesperado.\n` +
      `**Código:** \`${id}\`\n` +
      `> Diz este código ao suporte para investigarem.`;

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    } catch {
      // Já registámos o erro — não vale a pena fazer nada se isto também falhar
    }
  }
}

// ============================================================
// HELPERS DE BOTÕES DO TICKET
// ============================================================
async function notifyStaff(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const mentions = config.staffRoles.map(r => `<@&${r}>`).join(' ');
  await interaction.reply({ content: `🔔 ${mentions}`, ephemeral: false });
}

async function addUser(interaction) {
  const modal = new ModalBuilder().setCustomId(`addmodal_${interaction.channel.id}`).setTitle('➕ Adicionar membro');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('user_id').setLabel('ID do utilizador').setStyle(TextInputStyle.Short).setRequired(true)
  ));
  await interaction.showModal(modal);
}

async function togglePriority(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const ticket = config.tickets[interaction.channel.id];
  if (!ticket) return interaction.reply({ content: '❌', ephemeral: true });
  ticket.priority = !ticket.priority;
  await updateGuildConfig(interaction.guildId, { tickets: config.tickets });
  await interaction.reply({ content: `⚡ ${ticket.priority ? 'Prioridade ON' : 'Prioridade OFF'}`, ephemeral: true });
}

async function toggleLock(interaction) {
  const everyone = interaction.guild.roles.everyone;
  const perms = interaction.channel.permissionsFor(everyone);
  const locked = perms && !perms.has(PermissionFlagsBits.SendMessages);
  await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: locked ? null : false });
  await interaction.reply({ content: locked ? '🔓 Desbloqueado' : '🔐 Bloqueado', ephemeral: true });
}

async function renameTicket(interaction) {
  const modal = new ModalBuilder().setCustomId(`renamemodal_${interaction.channel.id}`).setTitle('✏️ Renomear ticket');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('new_name').setLabel('Novo nome').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
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
  if (!staff.length) return interaction.reply({ content: '❌ Sem staff disponível.', ephemeral: true });

  const menu = new StringSelectMenuBuilder().setCustomId(`transfer_select_${interaction.channel.id}`).setPlaceholder('Transferir')
    .addOptions(staff.map(m => ({ label: m.displayName.slice(0, 100), value: m.id })));
  await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
}

// ============================================================
// COMANDOS
// ============================================================
async function handleCommand(interaction, client) {
  const { commandName } = interaction;
  const config = await getGuildConfig(interaction.guildId);
  const locale = config.locale || 'pt-PT';
  const limits = getLimits(config.tier);

  // ---- 🎯 COMANDO PRINCIPAL ----
  if (commandName === 'pratic') {
    return enviarSetup(interaction);
  }

  // ---- /criar-cargos (admin) ----
  if (commandName === 'criar-cargos') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
    }
    const { criarTodosCargos } = await import('../services/createRoles.js');
    return criarTodosCargos(interaction);
  }

  // ---- /painel ----
  if (commandName === 'painel') {
    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      if (config.panels.length >= limits.maxPanels) {
        return interaction.reply({ content: `❌ Limite de ${limits.maxPanels} painéis.`, ephemeral: true });
      }
      const nome = interaction.options.getString('nome');
      const titulo = interaction.options.getString('titulo');
      const descricao = interaction.options.getString('descricao');
      const corInput = (interaction.options.getString('cor') || '#5865f2').trim();
      const cor = /^#[0-9a-fA-F]{6}$/.test(corInput) ? corInput : '#5865f2';
      const id = `p_${Date.now().toString(36)}`;
      config.panels.push({ id, nome, title: titulo, descricao, color: cor, options: [] });
      await updateGuildConfig(interaction.guildId, { panels: config.panels });
      return interaction.reply({ content: t(locale, 'panel.created', { id }), ephemeral: true });
    }

    if (sub === 'opcao') {
      const pid = interaction.options.getString('painel_id');
      const label = interaction.options.getString('label');
      const value = interaction.options.getString('value').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const panel = config.panels.find(p => p.id === pid);
      if (!panel) return interaction.reply({ content: '❌ Painel não encontrado.', ephemeral: true });
      if (panel.options.length >= limits.maxOptions) {
        return interaction.reply({ content: `❌ Limite de ${limits.maxOptions} opções.`, ephemeral: true });
      }
      if (panel.options.some(o => o.value === value)) {
        return interaction.reply({ content: `❌ Já existe uma opção com value \`${value}\`.`, ephemeral: true });
      }
      panel.options.push({ label, value });
      await updateGuildConfig(interaction.guildId, { panels: config.panels });
      return interaction.reply({ content: t(locale, 'panel.optionAdded', { n: panel.options.length, max: limits.maxOptions }), ephemeral: true });
    }

    if (sub === 'listar') {
      const txt = config.panels.map(p => `**${p.nome}** — \`${p.id}\` — ${p.options.length} opções`).join('\n') || t(locale, 'panel.listEmpty');
      return interaction.reply({ content: txt, ephemeral: true });
    }

    if (sub === 'enviar') {
      const pid = interaction.options.getString('painel_id');
      const canal = interaction.options.getChannel('canal');
      const panel = config.panels.find(p => p.id === pid);
      if (!panel || !panel.options.length) {
        return interaction.reply({ content: '❌ Painel não tem opções.', ephemeral: true });
      }

      // Dedupe
      const unique = [];
      const seen = new Set();
      for (const o of panel.options) {
        const v = o.value.slice(0, 100);
        if (seen.has(v)) continue;
        seen.add(v);
        unique.push({ label: o.label.slice(0, 100), value: v });
        if (unique.length >= 10) break;
      }

      const embed = new EmbedBuilder()
        .setTitle(panel.title)
        .setDescription(panel.descricao)
        .setTimestamp();

      aplicarBranding(embed, config, { color: panel.color || '#5865f2' });
      if (limits.watermark) embed.setFooter({ text: 'Pratic Bot' });

      const select = new StringSelectMenuBuilder()
        .setCustomId(`panel_${panel.id}`)
        .setPlaceholder(t(locale, 'panel.placeholder'))
        .addOptions(unique);

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

  // ---- /gerar-chave (só o dono do bot) ----
  if (commandName === 'gerar-chave') {
    if (interaction.user.id !== process.env.ADMIN_KEY) return interaction.reply({ content: t(locale, 'common.ownerOnly'), ephemeral: true });
    const tier = interaction.options.getString('tier');
    const dias = interaction.options.getInteger('dias') || 30;
    const chave = await criarChave(tier, dias);
    return interaction.reply({ content: `\`\`\`${chave}\`\`\``, ephemeral: true });
  }

  // ---- /admin-chaves (só o dono do bot) ----
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
      return interaction.reply({ content: ok ? '✅ Revogada' : '❌ Não encontrada', ephemeral: true });
    }
  }

  // ---- /erro (só o dono do bot) ----
  if (commandName === 'erro') {
    if (interaction.user.id !== process.env.ADMIN_KEY) {
      return interaction.reply({ content: '❌ Só o dono do bot.', ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'ver') {
      const id = interaction.options.getString('id').toUpperCase();
      const e = obterErro(id);

      if (!e) {
        return interaction.reply({
          content: `❌ Erro \`${id}\` não encontrado (só guardo os últimos 200 — reinícios limpam o cache).`,
          ephemeral: true
        });
      }

      const stackCurto = (e.stack || '').split('\n').slice(0, 8).join('\n').slice(0, 1800);

      const embed = new EmbedBuilder()
        .setTitle(`🚨 Erro ${e.id}`)
        .setDescription('```\n' + (e.message || '').slice(0, 400) + '\n```')
        .addFields(
          { name: 'Quando',  value: `<t:${Math.floor(e.ts.getTime()/1000)}:R>`, inline: true },
          { name: 'Código',  value: e.code ? `\`${e.code}\`` : '—',             inline: true },
          { name: 'Guild',   value: e.ctx.guildName ? `${e.ctx.guildName}\n\`${e.ctx.guildId}\`` : '—', inline: false },
          { name: 'User',    value: e.ctx.userTag ? `${e.ctx.userTag}\n\`${e.ctx.user}\`` : '—', inline: false },
          { name: 'Comando', value: e.ctx.command || e.ctx.customId || '—',     inline: false },
          { name: 'Stack',   value: '```\n' + stackCurto + '\n```',              inline: false }
        )
        .setColor('#ed4245')
        .setFooter({ text: 'Pratic Bot • error tracker' })
        .setTimestamp(e.ts);

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'recentes') {
      const lista = listarRecentes(10);

      if (!lista.length) {
        return interaction.reply({ content: '✅ Nenhum erro registado.', ephemeral: true });
      }

      const txt = lista.map(e =>
        `\`${e.id}\` <t:${Math.floor(e.ts.getTime()/1000)}:R> — ${e.message.slice(0, 80)}`
      ).join('\n');

      return interaction.reply({ content: txt, ephemeral: true });
    }
  }
}

// ============================================================
// MODAIS
// ============================================================
async function handleModal(interaction) {
  const { customId } = interaction;

  if (customId.startsWith('addmodal_')) {
    const channelId = customId.replace('addmodal_', '');
    const userId = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '');
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ Utilizador não encontrado.', ephemeral: true });
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) {
      await channel.permissionOverwrites.edit(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await channel.send(`➕ <@${member.id}>`);
    }
    return interaction.reply({ content: '✅ Adicionado.', ephemeral: true });
  }

  if (customId.startsWith('renamemodal_')) {
    const channelId = customId.replace('renamemodal_', '');
    const nome = interaction.fields.getTextInputValue('new_name').slice(0, 50);
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) await channel.setName(nome).catch(() => {});
    return interaction.reply({ content: '✅ Renomeado.', ephemeral: true });
  }
}
