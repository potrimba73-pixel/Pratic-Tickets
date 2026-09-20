// src/services/setupWizard.js
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder, ChannelType, ModalBuilder,
  TextInputBuilder, TextInputStyle, PermissionFlagsBits
} from 'discord.js';
import { getGuildConfig, updateGuildConfig, getLimits, TIERS } from '../database/guildConfig.js';
import { BRAND, EMOJI, footer } from '../ui/theme.js';
import { temBranding } from './branding.js';

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================
export async function enviarSetup(interaction) {
  const payload = await buildDashboard(interaction.guildId);
  if (interaction.replied || interaction.deferred) return interaction.editReply(payload);
  return interaction.reply({ ...payload, ephemeral: true });
}

async function buildDashboard(guildId) {
  const config = await getGuildConfig(guildId);
  const limits = getLimits(config.tier);
  const maxP = limits.maxPanels === 999 ? '∞' : limits.maxPanels;

  const ok = (v, t) => v ? `${EMOJI.success} ${t}` : `${EMOJI.error} Não definido`;
  const staffTxt = config.staffRoles.length
    ? config.staffRoles.map(r => `<@&${r}>`).join('\n')
    : `${EMOJI.error} Nenhum cargo`;

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${BRAND.name} • Centro de Configuração` })
    .setTitle(`${EMOJI.setup} Painel de Configuração`)
    .setDescription(
      '> Configura tudo **sem decorar comandos**.\n' +
      '> Clica nos botões abaixo para abrir cada secção.\n\u200b'
    )
    .addFields(
      {
        name: `${EMOJI.stats} Estado do Servidor`,
        value: [
          `${EMOJI.premium} **Plano:** \`${limits.nome}\``,
          `${EMOJI.language} **Idioma:** \`${config.locale}\``,
          `${EMOJI.panel} **Painéis:** \`${config.panels.length}/${maxP}\``
        ].join('\n'),
        inline: true
      },
      { name: `${EMOJI.staff} Staff`, value: staffTxt, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: `${EMOJI.logs} Logs`,             value: ok(config.logsChannelId, `<#${config.logsChannelId}>`),             inline: true },
      { name: `${EMOJI.transcripts} Transcripts`, value: ok(config.transcriptChannelId, `<#${config.transcriptChannelId}>`), inline: true },
      { name: `${EMOJI.category} Categoria`,     value: ok(config.categoryId, `<#${config.categoryId}>`),                    inline: true }
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
    new ButtonBuilder().setCustomId('setup_paineis').setLabel('Painéis').setEmoji(EMOJI.panels).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_branding').setLabel('Branding').setEmoji('🎨').setStyle(temBranding(config) ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_plano').setLabel('Meu Plano').setEmoji(EMOJI.premium).setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_auto').setLabel('Criar canais automáticos').setEmoji('🪄').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_teste').setLabel('Testar').setEmoji(EMOJI.test).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_ajuda').setLabel('Ajuda').setEmoji(EMOJI.help).setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2, row3] };
}

// ============================================================
// HELPERS
// ============================================================
function backRow(label = 'Voltar ao painel') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_home').setLabel(label).setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
}
async function renderHome(interaction) {
  await interaction.update(await buildDashboard(interaction.guildId));
}
const sec = (title, body, color = BRAND.color) =>
  new EmbedBuilder().setTitle(title).setDescription(body).setColor(color).setFooter(footer());

// ============================================================
// 🪄 AUTO-CRIAR CATEGORIA + CANAIS
// ============================================================
async function autoCriarCanais(interaction) {
  const guild = interaction.guild;
  const bot = guild.members.me;

  if (!bot.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content: `${EMOJI.error} Preciso da permissão **Gerir Canais**.`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const staffRoles = (await getGuildConfig(guild.id)).staffRoles;

  // Permissões: público bloqueado, staff vê
  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoles.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] }))
  ];

  // 1. Categoria
  const cat = await guild.channels.create({
    name: '📩 Tickets',
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites
  });

  // 2. Logs
  const logs = await guild.channels.create({
    name: '📝 ticket-logs',
    type: ChannelType.GuildText,
    parent: cat.id,
    topic: 'Registo de eventos dos tickets (Pratic Bot)'
  });

  // 3. Transcripts
  const trans = await guild.channels.create({
    name: '📄 ticket-transcripts',
    type: ChannelType.GuildText,
    parent: cat.id,
    topic: 'Históricos de tickets fechados (Pratic Bot)'
  });

  await updateGuildConfig(guild.id, {
    categoryId: cat.id,
    logsChannelId: logs.id,
    transcriptChannelId: trans.id
  });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.sparkle} Estrutura criada!`)
    .setDescription(
      'Criei tudo automaticamente:\n\n' +
      `> ${EMOJI.category} Categoria: <#${cat.id}>\n` +
      `> ${EMOJI.logs} Logs: <#${logs.id}>\n` +
      `> ${EMOJI.transcripts} Transcripts: <#${trans.id}>\n\n` +
      '**Próximo passo:** cria um **Painel** com o botão 🎫.'
    )
    .setColor(BRAND.success).setFooter(footer()).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_painel_novo').setLabel('Criar Painel').setEmoji(EMOJI.add).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ============================================================
// SECÇÕES SIMPLES
// ============================================================
async function renderLogs(i) {
  const s = new ChannelSelectMenuBuilder().setCustomId('setup_select_logs')
    .setPlaceholder(`${EMOJI.logs} Canal de logs`).addChannelTypes(ChannelType.GuildText)
    .setMinValues(1).setMaxValues(1);
  const e = sec(`${EMOJI.logs} Canal de Logs`,
    '**Para que serve?**\n> Onde aparecem os eventos dos tickets (aberto, assumido, fechado).\n\n**Dica:**\n> Usa o botão 🪄 **Criar canais automáticos** no painel para criar tudo de uma vez.');
  await i.update({ embeds: [e], components: [new ActionRowBuilder().addComponents(s), backRow()] });
}

async function renderTranscripts(i) {
  const s = new ChannelSelectMenuBuilder().setCustomId('setup_select_transcripts')
    .setPlaceholder(`${EMOJI.transcripts} Canal de transcripts`).addChannelTypes(ChannelType.GuildText)
    .setMinValues(1).setMaxValues(1);
  const e = sec(`${EMOJI.transcripts} Canal de Transcripts`,
    '**Para que serve?**\n> Quando um ticket fecha, o histórico `.html` e `.txt` é enviado aqui.');
  await i.update({ embeds: [e], components: [new ActionRowBuilder().addComponents(s), backRow()] });
}

async function renderCategoria(i) {
  const s = new ChannelSelectMenuBuilder().setCustomId('setup_select_categoria')
    .setPlaceholder(`${EMOJI.category} Categoria de tickets`).addChannelTypes(ChannelType.GuildCategory)
    .setMinValues(1).setMaxValues(1);
  const e = sec(`${EMOJI.category} Categoria`,
    '**Para que serve?**\n> Onde os canais de ticket são criados.\n\n**Dica:**\n> Uma categoria dedicada mantém o servidor limpo.');
  await i.update({ embeds: [e], components: [new ActionRowBuilder().addComponents(s), backRow()] });
}

// ============================================================
// 🛡️ STAFF — com valores pré-selecionados (o que pediste!)
// ============================================================
async function renderStaff(i) {
  const config = await getGuildConfig(i.guildId);

  const menu = new RoleSelectMenuBuilder()
    .setCustomId('setup_select_staff')
    .setPlaceholder(`${EMOJI.staff} Escolhe os cargos de staff`)
    .setMinValues(0)   // 0 para poder limpar tudo
    .setMaxValues(10);

  // ⭐ MOSTRA OS ANTERIORES PRÉ-SELECIONADOS
  if (config.staffRoles.length) {
    menu.setDefaultValues(...config.staffRoles.slice(0, 10));
  }

  const atual = config.staffRoles.length
    ? config.staffRoles.map(r => `> <@&${r}>`).join('\n')
    : '> `Nenhum cargo definido`';

  const embed = sec(`${EMOJI.staff} Cargos de Staff`,
    `**Atuais:**\n${atual}\n\n` +
    `> Os cargos acima já vêm **pré-selecionados** no menu abaixo.\n` +
    `> Remove ou adiciona à vontade — depois clica fora para guardar.\n\n` +
    `**Dica:** podes escolher até **10 cargos** de uma só vez.`
  );

  await i.update({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu), backRow()]
  });
}

async function renderIdioma(i) {
  const s = new StringSelectMenuBuilder().setCustomId('setup_select_idioma')
    .setPlaceholder(`${EMOJI.language} Idioma`)
    .addOptions(
      { label: 'Português (PT)', value: 'pt-PT', emoji: '🇵🇹' },
      { label: 'Português (BR)', value: 'pt-BR', emoji: '🇧🇷' },
      { label: 'Español',         value: 'es-ES', emoji: '🇪🇸' },
      { label: 'Русский',         value: 'ru',    emoji: '🇷🇺' },
      { label: 'English',         value: 'en',    emoji: '🇬🇧' }
    );
  const e = sec(`${EMOJI.language} Idioma`,
    '> Escolhe em que idioma o bot fala neste servidor.');
  await i.update({ embeds: [e], components: [new ActionRowBuilder().addComponents(s), backRow()] });
}

// ============================================================
// 🎨 BRANDING (Pro / Premium)
// ============================================================
async function renderBranding(i) {
  const config = await getGuildConfig(i.guildId);

  if (!temBranding(config)) {
    const embed = sec('🎨 Branding personalizado',
      `${EMOJI.warning} **Disponível apenas nos planos Pro e Premium.**\n\n` +
      '**O que ganhas:**\n' +
      '> • Nome próprio do bot (ex: *🎫 Suporte Alpha*)\n' +
      '> • Avatar personalizado no autor dos embeds\n' +
      '> • Banner grande nas DMs\n' +
      '> • Descrição da comunidade (aparece em DMs)\n' +
      '> • Cor personalizada dos embeds\n\n' +
      '💡 **Assim os teus membros reconhecem a comunidade** quando recebem DM do bot.',
      BRAND.warning);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_plano').setLabel('Ver planos').setEmoji(EMOJI.premium).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
    );
    return i.update({ embeds: [embed], components: [row] });
  }

  const b = config.branding;
  const embed = sec('🎨 Branding personalizado',
    `**Nome atual:** ${b.botName ? `\`${b.botName}\`` : '`Pratic Bot` (default)'}\n` +
    `**Avatar:** ${b.avatarUrl ? '✅ Definido' : '❌ Não definido'}\n` +
    `**Banner:** ${b.bannerUrl ? '✅ Definido' : '❌ Não definido'}\n` +
    `**Cor:** \`${b.color || '#5865f2'}\`\n` +
    `**Descrição:** ${b.description ? `\`${b.description}\`` : '❌ Não definida'}\n\n` +
    `> Esta identidade aparece **em todas as mensagens do bot nesta comunidade**, incluindo DMs.`,
    BRAND.purple);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_brand_edit').setLabel('Editar').setEmoji('✏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_brand_reset').setLabel('Resetar').setEmoji(EMOJI.trash).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
  await i.update({ embeds: [embed], components: [row] });
}

async function abrirModalBranding(i) {
  const config = await getGuildConfig(i.guildId);
  const b = config.branding || {};

  const modal = new ModalBuilder().setCustomId('setup_modal_brand').setTitle('🎨 Branding');

  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('botName').setLabel('Nome do bot (max 32)').setStyle(TextInputStyle.Short)
      .setRequired(false).setMaxLength(32).setValue(b.botName || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('description').setLabel('Descrição da comunidade (aparece em DM)').setStyle(TextInputStyle.Short)
      .setRequired(false).setMaxLength(120).setValue(b.description || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('avatarUrl').setLabel('URL do avatar (ícone)').setStyle(TextInputStyle.Short)
      .setRequired(false).setValue(b.avatarUrl || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('bannerUrl').setLabel('URL do banner (imagem grande)').setStyle(TextInputStyle.Short)
      .setRequired(false).setValue(b.bannerUrl || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('color').setLabel('Cor em hex (ex: #ff6b6b)').setStyle(TextInputStyle.Short)
      .setRequired(false).setMaxLength(7).setValue(b.color || '#5865f2'))
  );

  await i.showModal(modal);
}

async function guardarBranding(i) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  if (!lim.branding) {
    return i.reply({ content: `${EMOJI.error} O teu plano não suporta branding.`, ephemeral: true });
  }

  const cor = i.fields.getTextInputValue('color').trim();
  if (cor && !/^#[0-9a-fA-F]{6}$/.test(cor)) {
    return i.reply({ content: `${EMOJI.error} Cor inválida (usa formato \`#RRGGBB\`).`, ephemeral: true });
  }

  const branding = {
    botName: i.fields.getTextInputValue('botName').trim() || null,
    description: i.fields.getTextInputValue('description').trim() || null,
    avatarUrl: i.fields.getTextInputValue('avatarUrl').trim() || null,
    bannerUrl: i.fields.getTextInputValue('bannerUrl').trim() || null,
    color: cor || '#5865f2',
    status: config.branding?.status || null
  };

  await updateGuildConfig(i.guildId, { branding });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.sparkle} Branding guardado!`)
    .setDescription(
      `**${branding.botName || 'Pratic Bot'}** está agora ativo nesta comunidade.\n\n` +
      `> ${EMOJI.info} Vais ver este nome e cor **em todos os embeds e DMs**.`
    )
    .setColor(branding.color).setFooter(footer()).setTimestamp();

  if (branding.bannerUrl) embed.setImage(branding.bannerUrl);
  if (branding.avatarUrl) embed.setThumbnail(branding.avatarUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_branding').setLabel('Voltar ao branding').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
  await i.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function resetarBranding(i) {
  const config = await getGuildConfig(i.guildId);
  await updateGuildConfig(i.guildId, {
    branding: { botName: null, avatarUrl: null, bannerUrl: null, description: null, color: '#5865f2', status: null }
  });
  await i.reply({ content: `${EMOJI.success} Branding restaurado ao default.`, ephemeral: true });
  return renderBranding(i);
}

// ============================================================
// 💎 MEU PLANO (substitui /meuplano)
// ============================================================
async function renderPlano(i) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);

  const expiraEm = config.premiumUntil ? new Date(config.premiumUntil) : null;
  const diasRestantes = expiraEm ? Math.ceil((expiraEm - Date.now()) / 86400000) : null;

  const maxP = lim.maxPanels === 999 ? '∞' : lim.maxPanels;
  const maxM = lim.maxMsgs === Infinity ? '∞' : lim.maxMsgs;
  const uso = `${config.panels.length}/${maxP}`;

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.premium} Meu Plano`)
    .addFields(
      { name: 'Plano atual', value: `**${lim.nome}**${lim.preco ? ` — €${lim.preco}/mês` : ' (grátis)'}`, inline: true },
      { name: 'Estado', value: expiraEm ? `Ativo · **${diasRestantes}d**` : (config.tier === 'free' ? 'Gratuito' : '—'), inline: true },
      { name: 'Expira em', value: expiraEm ? `<t:${Math.floor(expiraEm.getTime()/1000)}:R>` : '—', inline: true },
      { name: `${EMOJI.panel} Painéis`, value: `\`${uso}\``, inline: true },
      { name: 'Opções/painel', value: `\`${lim.maxOptions}\``, inline: true },
      { name: 'Botões/ticket', value: `\`${lim.maxButtons}\``, inline: true },
      { name: `${EMOJI.transcripts} Msgs/transcript`, value: `\`${maxM}\``, inline: true },
      { name: `${EMOJI.star} Avaliações`, value: lim.rating ? '✅' : '❌', inline: true },
      { name: '🎨 Branding', value: lim.branding ? '✅' : '❌', inline: true }
    )
    .setColor(lim.branding ? BRAND.purple : BRAND.color)
    .setFooter(footer('Usa /pratic plano para ativar uma chave'))
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_ativar_chave').setLabel('Ativar chave').setEmoji('🔑').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_planos').setLabel('Ver planos').setEmoji(EMOJI.premium).setStyle(ButtonStyle.Primary),
    backRow().components[0]
  );

  await i.update({ embeds: [embed], components: [row] });
}

async function renderPlanos(i) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.premium} Planos disponíveis`)
    .setDescription(
      '**Todos incluem:** sistema completo de tickets · multi-idioma · painéis configuráveis · transcripts HTML/TXT.\n\u200b'
    )
    .addFields(
      {
        name: `🆓 Free — €0`,
        value: '`6 painéis` · `3 opções` · `3 botões` · `70 msgs` · com marca',
        inline: false
      },
      {
        name: `🔵 Básico — €5/mês`,
        value: '`15 painéis` · `5 opções` · `5 botões` · `90 msgs` · **sem marca**',
        inline: false
      },
      {
        name: `🟣 Pro — €10/mês`,
        value: '`20 painéis` · `10 opções` · `10 botões` · `200 msgs` · ⭐ avaliações · ⏰ auto-fecho · 🎨 **branding**',
        inline: false
      },
      {
        name: `🟡 Premium — €15/mês`,
        value: '`∞ painéis` · `10 opções` · `10 botões` · `∞ msgs` · ⭐ avaliações · ⏰ auto-fecho · 🎨 **branding total**',
        inline: false
      }
    )
    .setColor(BRAND.gold)
    .setFooter(footer('Compra uma chave e usa /pratic plano'))
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_ativar_chave').setLabel('Ativar chave').setEmoji('🔑').setStyle(ButtonStyle.Success),
    backRow().components[0]
  );
  await i.update({ embeds: [embed], components: [row] });
}

async function abrirModalChave(i) {
  const modal = new ModalBuilder().setCustomId('setup_modal_chave').setTitle('🔑 Ativar plano');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('chave').setLabel('Chave').setStyle(TextInputStyle.Short)
      .setRequired(true).setMaxLength(40).setPlaceholder('PRO-XXXX-YYYY')
  ));
  await i.showModal(modal);
}

// ============================================================
// PAINÉIS
// ============================================================
async function renderPaineis(i) {
  const config = await getGuildConfig(i.guildId);
  const limits = getLimits(config.tier);
  const maxP = limits.maxPanels === 999 ? '∞' : limits.maxPanels;

  const desc = config.panels.length
    ? config.panels.map((p, n) =>
        `**${n + 1}. ${p.nome}**\n> ${EMOJI.panel} \`${p.id}\` · opções: \`${p.options.length}/${limits.maxOptions}\`\n> *${p.title}*`
      ).join('\n\n')
    : '**Ainda não tens painéis.**\n> Clica em **Criar Painel** para começar.';

  const e = sec(`${EMOJI.panels} Painéis (${config.panels.length}/${maxP})`, desc);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_painel_novo').setLabel('Criar Painel').setEmoji(EMOJI.add).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_painel_envio').setLabel('Enviar painel').setEmoji('📤').setStyle(ButtonStyle.Primary),
    backRow().components[0]
  );
  await i.update({ embeds: [e], components: [row] });
}

async function abrirModalPainel(i) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  if (config.panels.length >= lim.maxPanels) {
    return i.reply({ content: `${EMOJI.error} Limite de **${lim.maxPanels}** painéis do plano ${lim.nome}.`, ephemeral: true });
  }
  const modal = new ModalBuilder().setCustomId('setup_modal_panel_create').setTitle(`${EMOJI.panel} Criar Painel`);
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome interno').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título do embed').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('descricao').setLabel('Descrição do embed').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500))
  );
  await i.showModal(modal);
}

async function guardarPainel(i) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  if (config.panels.length >= lim.maxPanels) {
    return i.reply({ content: `${EMOJI.error} Limite atingido.`, ephemeral: true });
  }
  const nome = i.fields.getTextInputValue('nome').slice(0, 50);
  const titulo = i.fields.getTextInputValue('titulo').slice(0, 100);
  const descricao = i.fields.getTextInputValue('descricao').slice(0, 500);
  const id = `p_${Date.now().toString(36)}`;

  config.panels.push({ id, nome, title: titulo, descricao, color: '#5865f2', options: [] });
  await updateGuildConfig(i.guildId, { panels: config.panels });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.sparkle} Painel criado!`)
    .setDescription(
      `**${nome}** · ID \`${id}\`\n\n` +
      `**Próximo passo — adiciona opções:**\n` +
      '```\n' +
      `/painel opcao painel_id:${id} label:Suporte value:suporte\n` +
      '```'
    )
    .setColor(BRAND.success).setFooter(footer()).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_paineis').setLabel('Ver Painéis').setEmoji(EMOJI.panels).setStyle(ButtonStyle.Primary),
    backRow().components[0]
  );
  await i.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ============================================================
// TESTE + AJUDA
// ============================================================
async function renderTeste(i) {
  const c = await getGuildConfig(i.guildId);
  const checks = [
    { ok: !!c.logsChannelId,       label: `${EMOJI.logs} Canal de Logs` },
    { ok: !!c.transcriptChannelId, label: `${EMOJI.transcripts} Transcripts` },
    { ok: !!c.categoryId,          label: `${EMOJI.category} Categoria` },
    { ok: !!c.staffRoles.length,   label: `${EMOJI.staff} Staff` },
    { ok: !!c.panels.length,       label: `${EMOJI.panel} Painel criado` }
  ];
  const passou = checks.filter(x => x.ok).length;
  const ok = passou === checks.length;
  const desc = checks.map(x => `${x.ok ? EMOJI.success : EMOJI.error} ${x.label}`).join('\n') +
    `\n\n**Resultado:** \`${passou}/${checks.length}\`\n\n` +
    (ok ? `${EMOJI.sparkle} Tudo configurado! Testa clicando numa opção do painel.`
        : `${EMOJI.warning} Faltam passos. Segue os botões do dashboard.`);
  await i.update({ embeds: [sec(`${EMOJI.test} Teste`, desc, ok ? BRAND.success : BRAND.warning)], components: [backRow()] });
}

async function renderAjuda(i) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.help} Ajuda do ${BRAND.name}`)
    .setDescription(
      '**Ordem recomendada:**\n' +
      '```\n' +
      '1.  🪄  Criar canais automáticos\n' +
      '2.  🛡️  Selecionar cargos de Staff\n' +
      '3.  🌐  Escolher idioma\n' +
      '4.  🎫  Criar painel\n' +
      '5.  💎  (Opcional) Ativar plano Pro/Premium\n' +
      '6.  🎨  (Pro+) Personalizar branding\n' +
      '```\n' +
      '**💡 Dicas**\n' +
      '> • Dá **Administrador** ao bot durante o setup\n' +
      '> • Testa antes de dar aos membros\n' +
      '> • O branding dos planos Pro/Premium aparece **nas DMs** aos teus membros'
    ).setColor(BRAND.color).setFooter(footer()).setTimestamp();
  await i.update({ embeds: [embed], components: [backRow()] });
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
export async function handleSetupInteraction(interaction) {
  const { customId } = interaction;

  // ---- MODAIS ----
  if (interaction.isModalSubmit()) {
    if (customId === 'setup_modal_panel_create') return guardarPainel(interaction);
    if (customId === 'setup_modal_brand')        return guardarBranding(interaction);
    if (customId === 'setup_modal_chave')        return import('./keysManager.js').then(m => m.processarChaveModal(interaction));
    return;
  }

  // ---- NAVEGAÇÃO ----
  if (customId === 'setup_home')    return renderHome(interaction);
  if (customId === 'setup_paineis') return renderPaineis(interaction);
  if (customId === 'setup_teste')   return renderTeste(interaction);
  if (customId === 'setup_ajuda')   return renderAjuda(interaction);
  if (customId === 'setup_plano')   return renderPlano(interaction);
  if (customId === 'setup_planos')  return renderPlanos(interaction);
  if (customId === 'setup_branding') return renderBranding(interaction);
  if (customId === 'setup_brand_edit') return abrirModalBranding(interaction);
  if (customId === 'setup_brand_reset') return resetarBranding(interaction);
  if (customId === 'setup_ativar_chave') return abrirModalChave(interaction);

  // ---- SECÇÕES ----
  if (customId === 'setup_logs')        return renderLogs(interaction);
  if (customId === 'setup_transcripts') return renderTranscripts(interaction);
  if (customId === 'setup_categoria')   return renderCategoria(interaction);
  if (customId === 'setup_staff')       return renderStaff(interaction);
  if (customId === 'setup_idioma')      return renderIdioma(interaction);

  // ---- AÇÕES ----
  if (customId === 'setup_painel_novo')  return abrirModalPainel(interaction);
  if (customId === 'setup_painel_envio') return import('./setupWizard.js').then(() => interaction.reply({
    content: '📤 Usa `/painel enviar painel_id:xxx canal:#canal` (a enviar painéis será movido para modal na próxima versão).',
    ephemeral: true
  }));
  if (customId === 'setup_auto')         return autoCriarCanais(interaction);

  // ---- SELECTS ----
  if (customId === 'setup_select_logs') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { logsChannelId: id });
    await interaction.followUp({ content: `${EMOJI.success} Logs: <#${id}>`, ephemeral: true });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_transcripts') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { transcriptChannelId: id });
    await interaction.followUp({ content: `${EMOJI.success} Transcripts: <#${id}>`, ephemeral: true });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_categoria') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { categoryId: id });
    await interaction.followUp({ content: `${EMOJI.success} Categoria: <#${id}>`, ephemeral: true });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_staff') {
    const ids = interaction.values; // já vem com default + alterações
    await updateGuildConfig(interaction.guildId, { staffRoles: ids });
    await interaction.followUp({
      content: ids.length ? `${EMOJI.success} Staff atualizado: ${ids.map(r => `<@&${r}>`).join(', ')}` : `${EMOJI.success} Staff limpo.`,
      ephemeral: true
    });
    return renderStaff(interaction); // re-renderiza com os novos defaults
  }
  if (customId === 'setup_select_idioma') {
    const loc = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { locale: loc });
    await interaction.followUp({ content: `${EMOJI.success} Idioma: \`${loc}\``, ephemeral: true });
    return renderHome(interaction);
  }
}
