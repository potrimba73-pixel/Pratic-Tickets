import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder, ChannelType, PermissionFlagsBits
} from 'discord.js';
import { getGuildConfig, updateGuildConfig, getLimits } from '../database/guildConfig.js';

// ============================================================
// EMBED PRINCIPAL DO SETUP
// ============================================================
export async function enviarSetup(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const limits = getLimits(config.tier);

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Setup do Pratic Bot')
    .setDescription(
      '**Bem-vindo ao configurador visual!**\n\n' +
      'Clica nos botões abaixo para configurar cada parte do bot.\n' +
      'Não precisas de escrever comandos — só escolher das listas. 🎯'
    )
    .addFields(
      {
        name: '📝 Canal de Logs',
        value: config.logsChannelId ? `<#${config.logsChannelId}>` : '`❌ Não definido`',
        inline: true
      },
      {
        name: '📄 Canal de Transcripts',
        value: config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : '`❌ Não definido`',
        inline: true
      },
      {
        name: '📁 Categoria de Tickets',
        value: config.categoryId ? `<#${config.categoryId}>` : '`❌ Não definido`',
        inline: true
      },
      {
        name: '🛡️ Cargos de Staff',
        value: config.staffRoles.length ? config.staffRoles.map(r => `<@&${r}>`).join('\n') : '`❌ Nenhum`',
        inline: false
      },
      {
        name: '🎫 Painéis',
        value: config.panels.length ? `${config.panels.length} painel(is) — usa **🎫 Criar Painel** para adicionar` : '`❌ Nenhum`',
        inline: false
      },
      {
        name: '📊 Plano',
        value: `**${limits.nome}**`,
        inline: true
      },
      {
        name: '🌐 Idioma',
        value: `**${config.locale || 'pt-PT'}**`,
        inline: true
      }
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Pratic Bot • Configuração interativa' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_logs').setLabel('📝 Logs').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_transcripts').setLabel('📄 Transcripts').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_staff').setLabel('🛡️ Staff').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_categoria').setLabel('📁 Categoria').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_idioma').setLabel('🌐 Idioma').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_painel').setLabel('🎫 Criar Painel').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_teste').setLabel('🧪 Testar Ticket').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_ajuda').setLabel('❓ Ajuda').setStyle(ButtonStyle.Secondary)
  );

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({ embeds: [embed], components: [row1, row2] });
  }
  return interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

// ============================================================
// HANDLER DE BOTÕES E SELECTS DO SETUP
// ============================================================
export async function handleSetupInteraction(interaction) {
  const { customId } = interaction;

  // ---- BOTÃO: LOGS ----
  if (customId === 'setup_logs') {
    const select = new ChannelSelectMenuBuilder()
      .setCustomId('setup_select_logs')
      .setPlaceholder('📝 Escolhe o canal de logs')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      content: '📝 **Escolhe o canal onde os logs dos tickets vão aparecer:**',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ---- BOTÃO: TRANSCRIPTS ----
  if (customId === 'setup_transcripts') {
    const select = new ChannelSelectMenuBuilder()
      .setCustomId('setup_select_transcripts')
      .setPlaceholder('📄 Escolhe o canal de transcripts')
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      content: '📄 **Escolhe o canal onde os transcripts vão ser guardados:**',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ---- BOTÃO: STAFF ----
  if (customId === 'setup_staff') {
    const select = new RoleSelectMenuBuilder()
      .setCustomId('setup_select_staff')
      .setPlaceholder('🛡️ Escolhe os cargos de staff')
      .setMinValues(1)
      .setMaxValues(5);

    return interaction.reply({
      content: '🛡️ **Escolhe os cargos de staff** (podes escolher vários):',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ---- BOTÃO: CATEGORIA ----
  if (customId === 'setup_categoria') {
    const select = new ChannelSelectMenuBuilder()
      .setCustomId('setup_select_categoria')
      .setPlaceholder('📁 Escolhe a categoria dos tickets')
      .addChannelTypes(ChannelType.GuildCategory)
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      content: '📁 **Escolhe a categoria onde os tickets vão ser criados:**',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ---- BOTÃO: IDIOMA ----
  if (customId === 'setup_idioma') {
    const select = new StringSelectMenuBuilder()
      .setCustomId('setup_select_idioma')
      .setPlaceholder('🌐 Escolhe o idioma do servidor')
      .addOptions(
        { label: '🇵🇹 Português (PT)', value: 'pt-PT' },
        { label: '🇧🇷 Português (BR)', value: 'pt-BR' },
        { label: '🇪🇸 Español', value: 'es-ES' },
        { label: '🇷🇺 Русский', value: 'ru' },
        { label: '🇬🇧 English', value: 'en' }
      );

    return interaction.reply({
      content: '🌐 **Escolhe o idioma das mensagens do bot:**',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ---- BOTÃO: CRIAR PAINEL ----
  if (customId === 'setup_painel') {
    return interaction.reply({
      content:
        '🎫 **Criar um painel de tickets:**\n\n' +
        'Usa os comandos abaixo no chat (nesta ordem):\n\n' +
        '```\n' +
        '/painel criar nome:Suporte titulo:🎫 Suporte descricao:Abre um ticket\n' +
        '/painel opcao painel_id:p_xxx label:Suporte value:suporte\n' +
        '/painel enviar painel_id:p_xxx canal:#suporte\n' +
        '```\n\n' +
        '💡 **Dica:** podes criar vários painéis (Suporte, Compras, Recrutamento, etc.)',
      ephemeral: true
    });
  }

  // ---- BOTÃO: TESTE ----
  if (customId === 'setup_teste') {
    const config = await getGuildConfig(interaction.guildId);

    if (!config.logsChannelId && !config.transcriptChannelId && !config.categoryId) {
      return interaction.reply({
        content: '❌ **Configura primeiro!** Falta definir pelo menos a categoria e um canal.',
        ephemeral: true
      });
    }

    if (!config.panels.length) {
      return interaction.reply({
        content: '❌ **Cria primeiro um painel!** Usa o botão **🎫 Criar Painel**.',
        ephemeral: true
      });
    }

    const faltas = [];
    if (!config.logsChannelId) faltas.push('📝 Logs');
    if (!config.transcriptChannelId) faltas.push('📄 Transcripts');
    if (!config.categoryId) faltas.push('📁 Categoria');
    if (!config.staffRoles.length) faltas.push('🛡️ Staff');

    if (faltas.length) {
      return interaction.reply({
        content: `⚠️ **Falta configurar:** ${faltas.join(', ')}\n\nMas já podes testar! Vai ao painel e clica numa opção.`,
        ephemeral: true
      });
    }

    return interaction.reply({
      content: '✅ **Tudo configurado!** Vai ao canal onde enviaste o painel e clica numa opção para testar.',
      ephemeral: true
    });
  }

  // ---- BOTÃO: AJUDA ----
  if (customId === 'setup_ajuda') {
    const embed = new EmbedBuilder()
      .setTitle('❓ Ajuda do Pratic Bot')
      .setDescription(
        '**Ordem recomendada de configuração:**\n\n' +
        '1️⃣ **📝 Logs** — canal onde aparecem os eventos dos tickets\n' +
        '2️⃣ **📄 Transcripts** — canal onde são guardados os históricos\n' +
        '3️⃣ **📁 Categoria** — onde os canais de ticket são criados\n' +
        '4️⃣ **🛡️ Staff** — cargos que podem ver/assumir tickets\n' +
        '5️⃣ **🌐 Idioma** — PT, BR, ES, RU ou EN\n' +
        '6️⃣ **🎫 Criar Painel** — o menu que os membros veem\n\n' +
        '**💡 Dicas:**\n' +
        '• Cria uma categoria dedicada a tickets\n' +
        '• Cria um canal só para logs\n' +
        '• Cria um canal só para transcripts\n' +
        '• Dá permissão de Administrador ao bot (temporário)\n' +
        '• Testa sempre antes de dar aos clientes'
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'Precisas de mais ajuda? Contacta o suporte.' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ---- SELECT: LOGS ----
  if (customId === 'setup_select_logs') {
    const canalId = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { logsChannelId: canalId });
    await interaction.update({
      content: `✅ **Canal de logs definido:** <#${canalId}>`,
      components: []
    });
    return;
  }

  // ---- SELECT: TRANSCRIPTS ----
  if (customId === 'setup_select_transcripts') {
    const canalId = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { transcriptChannelId: canalId });
    await interaction.update({
      content: `✅ **Canal de transcripts definido:** <#${canalId}>`,
      components: []
    });
    return;
  }

  // ---- SELECT: STAFF ----
  if (customId === 'setup_select_staff') {
    const roleIds = interaction.values;
    await updateGuildConfig(interaction.guildId, { staffRoles: roleIds });
    await interaction.update({
      content: `✅ **Cargos de staff definidos:** ${roleIds.map(r => `<@&${r}>`).join(', ')}`,
      components: []
    });
    return;
  }

  // ---- SELECT: CATEGORIA ----
  if (customId === 'setup_select_categoria') {
    const categoriaId = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { categoryId: categoriaId });
    await interaction.update({
      content: `✅ **Categoria de tickets definida:** <#${categoriaId}>`,
      components: []
    });
    return;
  }

  // ---- SELECT: IDIOMA ----
  if (customId === 'setup_select_idioma') {
    const locale = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { locale });
    await interaction.update({
      content: `✅ **Idioma definido:** ${locale}`,
      components: []
    });
    return;
  }
}
