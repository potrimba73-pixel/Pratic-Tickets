// src/services/setupWizard.js
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder, ChannelType, ModalBuilder,
  TextInputBuilder, TextInputStyle, PermissionFlagsBits
} from 'discord.js';
import { getGuildConfig, updateGuildConfig, getLimits } from '../database/guildConfig.js';
import { BRAND, EMOJI, footer } from '../ui/theme.js';

// ============================================================
// ENTRYPOINT — chamado por /setup
// ============================================================
export async function enviarSetup(interaction) {
  const payload = await buildDashboard(interaction.guildId);
  if (interaction.replied || interaction.deferred) {
    return interaction.editReply(payload);
  }
  return interaction.reply({ ...payload, ephemeral: true });
}

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================
async function buildDashboard(guildId) {
  const config = await getGuildConfig(guildId);
  const limits = getLimits(config.tier);
  const maxP = limits.maxPanels === 999 ? '∞' : limits.maxPanels;

  const status = (v, txt = 'Definido') => v ? `${EMOJI.success} ${txt}` : `${EMOJI.error} Não definido`;
  const staffTxt = config.staffRoles.length
    ? config.staffRoles.map(r => `<@&${r}>`).join('\n')
    : `${EMOJI.error} Nenhum cargo`;

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${BRAND.name} • Centro de Configuração` })
    .setTitle(`${EMOJI.setup} Painel de Configuração`)
    .setDescription(
      '> Configura o bot **sem decorar comandos**.\n' +
      '> Clica nos botões abaixo para abrir cada secção.\n\u200b'
    )
    .addFields(
      {
        name: `${EMOJI.stats} Estado do Servidor`,
        value: [
          `${EMOJI.premium} **Plano:** \`${limits.nome}\``,
          `${EMOJI.language} **Idioma:** \`${config.locale || 'pt-PT'}\``,
          `${EMOJI.panel} **Painéis:** \`${config.panels.length}/${maxP}\``
        ].join('\n'),
        inline: true
      },
      {
        name: `${EMOJI.staff} Staff`,
        value: staffTxt,
        inline: true
      },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: `${EMOJI.logs} Logs`,        value: status(config.logsChannelId, `<#${config.logsChannelId}>`),        inline: true },
      { name: `${EMOJI.transcripts} Transcripts`, value: status(config.transcriptChannelId, `<#${config.transcriptChannelId}>`), inline: true },
      { name: `${EMOJI.category} Categoria`, value: status(config.categoryId, `<#${config.categoryId}>`),              inline: true }
    )
    .setColor(BRAND.color)
    .setFooter(footer('Configuração interativa'))
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_logs').setLabel('Logs').setEmoji(EMOJI.logs).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_transcripts').setLabel('Transcripts').setEmoji(EMOJI.transcripts).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_categoria').setLabel('Categoria').setEmoji(EMOJI.category).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_staff').setLabel('Staff').setEmoji(EMOJI.staff).setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_idioma').setLabel('Idioma').setEmoji(EMOJI.language).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_painel_novo').setLabel('Criar Painel').setEmoji(EMOJI.add).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_paineis').setLabel('Ver Painéis').setEmoji(EMOJI.panels).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_teste').setLabel('Testar').setEmoji(EMOJI.test).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_ajuda').setLabel('Ajuda').setEmoji(EMOJI.help).setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

// ============================================================
// HELPERS
// ============================================================
function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar ao painel').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
}

async function renderHome(interaction) {
  const payload = await buildDashboard(interaction.guildId);
  await interaction.update(payload);
}

function sectionEmbed(title, body, color = BRAND.color) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(body)
    .setColor(color)
    .setFooter(footer());
}

// ============================================================
// SECÇÕES
// ============================================================
async function renderLogs(interaction) {
  const select = new ChannelSelectMenuBuilder()
    .setCustomId('setup_select_logs')
    .setPlaceholder(`${EMOJI.logs} Escolhe o canal de logs`)
    .addChannelTypes(ChannelType.GuildText)
    .setMinValues(1).setMaxValues(1);

  const embed = sectionEmbed(
    `${EMOJI.logs} Canal de Logs`,
    '**Para que serve?**\n' +
    '> Aqui aparecem todos os eventos dos tickets: abertos, fechados, assumidos, etc.\n\n' +
    '**Recomendação:**\n' +
    '> Cria um canal `#ticket-logs` visível apenas para staff.'
  );
  await interaction.update({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select), backRow()]
  });
}

async function renderTranscripts(interaction) {
  const select = new ChannelSelectMenuBuilder()
    .setCustomId('setup_select_transcripts')
    .setPlaceholder(`${EMOJI.transcripts} Escolhe o canal de transcripts`)
    .addChannelTypes(ChannelType.GuildText)
    .setMinValues(1).setMaxValues(1);

  const embed = sectionEmbed(
    `${EMOJI.transcripts} Canal de Transcripts`,
    '**Para que serve?**\n' +
    '> Quando um ticket é fechado, o histórico completo é enviado aqui em `.html` e `.txt`.\n\n' +
    '**Recomendação:**\n' +
    '> Cria um canal `#ticket-transcripts` privado.'
  );
  await interaction.update({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select), backRow()]
  });
}

async function renderCategoria(interaction) {
  const select = new ChannelSelectMenuBuilder()
    .setCustomId('setup_select_categoria')
    .setPlaceholder(`${EMOJI.category} Escolhe a categoria`)
    .addChannelTypes(ChannelType.GuildCategory)
    .setMinValues(1).setMaxValues(1);

  const embed = sectionEmbed(
    `${EMOJI.category} Categoria de Tickets`,
    '**Para que serve?**\n' +
    '> Todos os canais de ticket vão ser criados dentro desta categoria.\n\n' +
    '**Recomendação:**\n' +
    '> Cria uma categoria `📩 Tickets` no fundo do servidor.'
  );
  await interaction.update({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select), backRow()]
  });
}

async function renderStaff(interaction) {
  const select = new RoleSelectMenuBuilder()
    .setCustomId('setup_select_staff')
    .setPlaceholder(`${EMOJI.staff} Escolhe os cargos de staff`)
    .setMinValues(1).setMaxValues(5);

  const embed = sectionEmbed(
    `${EMOJI.staff} Cargos de Staff`,
    '**Para que serve?**\n' +
    '> Cargos que podem ver, assumir e fechar tickets.\n\n' +
    '**Dica:**\n' +
    '> Podes escolher até **5 cargos** de uma só vez.'
  );
  await interaction.update({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select), backRow()]
  });
}

async function renderIdioma(interaction) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('setup_select_idioma')
    .setPlaceholder(`${EMOJI.language} Escolhe o idioma`)
    .addOptions(
      { label: 'Português (PT)', value: 'pt-PT', emoji: '🇵🇹' },
      { label: 'Português (BR)', value: 'pt-BR', emoji: '🇧🇷' },
      { label: 'Español',         value: 'es-ES', emoji: '🇪🇸' },
      { label: 'Русский',         value: 'ru',    emoji: '🇷🇺' },
      { label: 'English',         value: 'en',    emoji: '🇬🇧' }
    );

  const embed = sectionEmbed(
    `${EMOJI.language} Idioma`,
    '> Escolhe em que idioma o bot fala neste servidor.\n\n' +
    '**Idiomas suportados:** 🇵🇹 PT · 🇧🇷 BR · 🇪🇸 ES · 🇷🇺 RU · 🇬🇧 EN'
  );
  await interaction.update({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select), backRow()]
  });
}

async function renderPaineis(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const limits = getLimits(config.tier);
  const maxP = limits.maxPanels === 999 ? '∞' : limits.maxPanels;

  let desc;
  if (!config.panels.length) {
    desc =
      '**Ainda não tens painéis.**\n\n' +
      `${EMOJI.arrow} Clica em **Criar Painel** para começar.\n` +
      `${EMOJI.arrow} Adiciona opções com \`/painel opcao\`.\n` +
      `${EMOJI.arrow} Envia com \`/painel enviar\`.';
  } else {
    desc = config.panels.map((p, i) =>
      `**${i + 1}. ${p.nome}**\n` +
      `> ${EMOJI.panel} ID: \`${p.id}\`\n` +
      `> ${EMOJI.info} Opções: \`${p.options.length}/${limits.maxOptions}\`\n` +
      `> ${EMOJI.arrow} Título: *${p.title}*`
    ).join('\n\n');
  }

  const embed = sectionEmbed(
    `${EMOJI.panels} Painéis (${config.panels.length}/${maxP})`,
    desc
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_painel_novo').setLabel('Criar Painel').setEmoji(EMOJI.add).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function renderTeste(interaction) {
  const config = await getGuildConfig(interaction.guildId);

  const checks = [
    { ok: !!config.logsChannelId,      label: `${EMOJI.logs} Canal de Logs` },
    { ok: !!config.transcriptChannelId, label: `${EMOJI.transcripts} Canal de Transcripts` },
    { ok: !!config.categoryId,         label: `${EMOJI.category} Categoria` },
    { ok: !!config.staffRoles.length,  label: `${EMOJI.staff} Cargos de Staff` },
    { ok: !!config.panels.length,      label: `${EMOJI.panel} Painel criado` }
  ];

  const passou = checks.filter(c => c.ok).length;
  const total = checks.length;
  const tudoOk = passou === total;

  const desc =
    checks.map(c => `${c.ok ? EMOJI.success : EMOJI.error} ${c.label}`).join('\n') +
    `\n\n**Resultado:** \`${passou}/${total}\`\n\n` +
    (tudoOk
      ? `${EMOJI.sparkle} **Tudo configurado!** Vai ao canal do painel e testa.`
      : `${EMOJI.warning} Faltam alguns passos. Configura tudo para a melhor experiência.`);

  const embed = sectionEmbed(
    `${EMOJI.test} Teste de Configuração`,
    desc,
    tudoOk ? BRAND.success : BRAND.warning
  );

  await interaction.update({ embeds: [embed], components: [backRow()] });
}

async function renderAjuda(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.help} Ajuda do ${BRAND.name}`)
    .setDescription(
      '**Ordem recomendada:**\n' +
      '```\n' +
      '1️⃣  📝 Logs         — onde ficam os eventos\n' +
      '2️⃣  📄 Transcripts  — onde ficam os históricos\n' +
      '3️⃣  📁 Categoria    — onde os tickets são criados\n' +
      '4️⃣  🛡️  Staff        — quem pode ver/assumir\n' +
      '5️⃣  🌐 Idioma       — PT · BR · ES · RU · EN\n' +
      '6️⃣  🎫 Painel       — menu que os membros veem\n' +
      '```\n' +
      '**💡 Dicas de ouro**\n' +
      '> • Cria uma categoria dedicada a tickets\n' +
      '> • Dá permissão de **Administrador** ao bot (temporário)\n' +
      '> • Testa sempre com a conta de um membro antes de lançar\n\n' +
      '**Comandos úteis**\n' +
      '> `/painel criar` · `/painel opcao` · `/painel enviar`'
    )
    .setColor(BRAND.color)
    .setFooter(footer('Suporte disponível no servidor'))
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [backRow()] });
}

// ============================================================
// MODAL: CRIAR PAINEL
// ============================================================
async function openPanelModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('setup_modal_panel_create')
    .setTitle(`${EMOJI.panel} Criar Painel`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('nome').setLabel('Nome interno (ex: Suporte)')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('titulo').setLabel('Título do embed')
        .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('descricao').setLabel('Descrição do embed')
        .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    )
  );

  await interaction.showModal(modal);
}

async function handlePanelModal(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const limits = getLimits(config.tier);
  if (config.panels.length >= limits.maxPanels) {
    return interaction.reply({
      content: `${EMOJI.error} Atingiste o limite de **${limits.maxPanels}** painéis do plano **${limits.nome}**.`,
      ephemeral: true
    });
  }

  const nome = interaction.fields.getTextInputValue('nome').slice(0, 50);
  const titulo = interaction.fields.getTextInputValue('titulo').slice(0, 100);
  const descricao = interaction.fields.getTextInputValue('descricao').slice(0, 500);
  const id = `p_${Date.now().toString(36)}`;

  config.panels.push({ id, nome, title: titulo, descricao, color: '#5865f2', options: [] });
  await updateGuildConfig(interaction.guildId, { panels: config.panels });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.sparkle} Painel criado!`)
    .setDescription(
      `**${nome}** foi criado com sucesso.\n\n` +
      `> ${EMOJI.panel} ID: \`${id}\`\n` +
      `> ${EMOJI.info} Opções: \`0/${limits.maxOptions}\`\n\n` +
      `**Próximo passo:**\n` +
      '```\n' +
      `/painel opcao painel_id:${id} label:Suporte value:suporte\n` +
      '/painel enviar painel_id:' + id + ' canal:#suporte\n' +
      '```'
    )
    .setColor(BRAND.success)
    .setFooter(footer())
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_paineis').setLabel('Ver Painéis').setEmoji(EMOJI.panels).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar ao painel').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
export async function handleSetupInteraction(interaction) {
  const { customId } = interaction;

  // ---- MODAIS ----
  if (interaction.isModalSubmit()) {
    if (customId === 'setup_modal_panel_create') return handlePanelModal(interaction);
    return;
  }

  // ---- NAVEGAÇÃO ----
  if (customId === 'setup_home' || customId === 'setup_refresh') return renderHome(interaction);
  if (customId === 'setup_paineis')  return renderPaineis(interaction);
  if (customId === 'setup_teste')    return renderTeste(interaction);
  if (customId === 'setup_ajuda')    return renderAjuda(interaction);

  // ---- SECÇÕES ----
  if (customId === 'setup_logs')       return renderLogs(interaction);
  if (customId === 'setup_transcripts') return renderTranscripts(interaction);
  if (customId === 'setup_categoria')  return renderCategoria(interaction);
  if (customId === 'setup_staff')      return renderStaff(interaction);
  if (customId === 'setup_idioma')     return renderIdioma(interaction);

  // ---- CRIAR PAINEL ----
  if (customId === 'setup_painel_novo') return openPanelModal(interaction);

  // ---- SELECTS ----
  if (customId === 'setup_select_logs') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { logsChannelId: id });
    await interaction.followUp({ content: `${EMOJI.success} Logs definidos: <#${id}>`, ephemeral: true });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_transcripts') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { transcriptChannelId: id });
    await interaction.followUp({ content: `${EMOJI.success} Transcripts definidos: <#${id}>`, ephemeral: true });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_categoria') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { categoryId: id });
    await interaction.followUp({ content: `${EMOJI.success} Categoria definida: <#${id}>`, ephemeral: true });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_staff') {
    const ids = interaction.values;
    await updateGuildConfig(interaction.guildId, { staffRoles: ids });
    await interaction.followUp({ content: `${EMOJI.success} Staff definido: ${ids.map(r => `<@&${r}>`).join(', ')}`, ephemeral: true });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_idioma') {
    const loc = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { locale: loc });
    await interaction.followUp({ content: `${EMOJI.success} Idioma alterado para \`${loc}\``, ephemeral: true });
    return renderHome(interaction);
  }
}
