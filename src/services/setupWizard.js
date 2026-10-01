// src/services/setupWizard.js
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder, ChannelType, ModalBuilder,
  TextInputBuilder, TextInputStyle, PermissionFlagsBits
} from 'discord.js';
import { getGuildConfig, updateGuildConfig, getLimits } from '../database/guildConfig.js';
import { BRAND, EMOJI, footer } from '../ui/theme.js';
import { temBranding, aplicarBranding } from './branding.js';
import { t } from '../i18n.js';
import { safeReply, safeUpdate } from '../utils/safeInteraction.js';

// ============================================================
// HELPERS
// ============================================================
function canalOuNull(guild, id) {
  if (!id) return null;
  return guild.channels.cache.has(id) ? `<#${id}>` : null;
}

function backRow(label) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_home')
      .setLabel(label || 'Voltar')
      .setEmoji(EMOJI.back)
      .setStyle(ButtonStyle.Secondary)
  );
}

// ============================================================
// DASHBOARD
// ============================================================
export async function enviarSetup(interaction) {
  const payload = await buildDashboard(interaction);
  return safeReply(interaction, { ...payload, ephemeral: true });
}

async function buildDashboard(interaction) {
  const guild = interaction.guild;
  const config = await getGuildConfig(guild.id);
  const limits = getLimits(config.tier);
  const locale = config.locale || 'pt-PT';
  const maxP = limits.maxPanels === 999 ? '∞' : limits.maxPanels;

  const ch = (id) => canalOuNull(guild, id);
  const ok = (v, txt) => v ? `${EMOJI.success} ${txt}` : `${EMOJI.error} ${t(locale, 'wizard.notSet')}`;

  const staffTxt = config.staffRoles.length
    ? config.staffRoles.map(r => `<@&${r}>`).join('\n')
    : `${EMOJI.error} ${t(locale, 'wizard.noStaff')}`;

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${BRAND.name} • ${t(locale, 'wizard.author')}` })
    .setTitle(t(locale, 'wizard.title'))
    .setDescription(t(locale, 'wizard.desc') + '\n\u200b')
    .addFields(
      {
        name: t(locale, 'wizard.state'),
        value: [
          `${EMOJI.premium} **${t(locale, 'wizard.plan')}:** \`${limits.nome}\``,
          `${EMOJI.language} **${t(locale, 'wizard.language')}:** \`${locale}\``,
          `${EMOJI.panel} **${t(locale, 'wizard.panels')}:** \`${config.panels.length}/${maxP}\``
        ].join('\n'),
        inline: true
      },
      { name: `${EMOJI.staff} ${t(locale, 'wizard.staff')}`, value: staffTxt, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: `${EMOJI.logs} ${t(locale, 'wizard.logs')}`,               value: ok(ch(config.logsChannelId), ch(config.logsChannelId)),               inline: true },
      { name: `${EMOJI.transcripts} ${t(locale, 'wizard.transcripts')}`, value: ok(ch(config.transcriptChannelId), ch(config.transcriptChannelId)), inline: true },
      { name: `${EMOJI.category} ${t(locale, 'wizard.category')}`,       value: ok(ch(config.categoryId), ch(config.categoryId)),                     inline: true }
    )
    .setColor(BRAND.color)
    .setFooter(footer(t(locale, 'wizard.author')))
    .setTimestamp();

  const btn = (id, key, emoji, style) =>
    new ButtonBuilder()
      .setCustomId(id)
      .setLabel(t(locale, `wizard.btn.${key}`))
      .setEmoji(emoji)
      .setStyle(style);

  const row1 = new ActionRowBuilder().addComponents(
    btn('setup_logs', 'logs', EMOJI.logs, ButtonStyle.Primary),
    btn('setup_transcripts', 'transcripts', EMOJI.transcripts, ButtonStyle.Primary),
    btn('setup_categoria', 'category', EMOJI.category, ButtonStyle.Primary),
    btn('setup_staff', 'staff', EMOJI.staff, ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    btn('setup_idioma', 'language', EMOJI.language, ButtonStyle.Secondary),
    btn('setup_painel_novo', 'newPanel', EMOJI.add, ButtonStyle.Success),
    btn('setup_paineis', 'panels', EMOJI.panels, ButtonStyle.Secondary),
    btn('setup_branding', 'branding', '🎨', temBranding(config) ? ButtonStyle.Success : ButtonStyle.Secondary),
    btn('setup_plano', 'myPlan', EMOJI.premium, ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    btn('setup_auto', 'auto', '🪄', ButtonStyle.Success),
    btn('setup_teste', 'test', EMOJI.test, ButtonStyle.Secondary),
    btn('setup_ajuda', 'help', EMOJI.help, ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2, row3] };
}

async function renderHome(interaction) {
  await interaction.deferUpdate().catch(() => {});
  const payload = await buildDashboard(interaction);
  return interaction.editReply(payload).catch(() => {});
}

const sec = (title, body, color = BRAND.color) =>
  new EmbedBuilder().setTitle(title).setDescription(body).setColor(color).setFooter(footer());

// ============================================================
// 🪄 AUTO-CRIAR CANAIS (com confirmação)
// ============================================================
async function autoCriarCanais(interaction) {
  const guild = interaction.guild;
  const bot = guild.members.me;

  if (!bot.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return safeReply(interaction, {
      content: `${EMOJI.error} Preciso da permissão **Gerir Canais**.`,
      ephemeral: true
    });
  }

  const config = await getGuildConfig(guild.id);
  const locale = config.locale || 'pt-PT';

  const existentes = {
    categoria:  config.categoryId          ? guild.channels.cache.get(config.categoryId)          : null,
    logs:       config.logsChannelId       ? guild.channels.cache.get(config.logsChannelId)       : null,
    transcripts:config.transcriptChannelId ? guild.channels.cache.get(config.transcriptChannelId) : null
  };

  const jaTem = existentes.categoria || existentes.logs || existentes.transcripts;

  if (jaTem) {
    const lista =
      (existentes.categoria   ? `> 📁 <#${config.categoryId}>\n` : '') +
      (existentes.logs        ? `> 📝 <#${config.logsChannelId}>\n` : '') +
      (existentes.transcripts ? `> 📄 <#${config.transcriptChannelId}>\n` : '');

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI.warning} Já tens estrutura configurada`)
      .setDescription(
        `${lista}\n**O que queres fazer?**\n\n` +
        `> ✅ **Manter** — usa os canais que já existem\n` +
        `> 🗑️ **Apagar e recriar** — apaga estes e cria novos\n` +
        `> 🔁 **Criar ao lado** — adiciona nova categoria (pode duplicar)`
      )
      .setColor(BRAND.warning)
      .setFooter(footer());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_auto_reuse').setLabel('Manter').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('setup_auto_recreate').setLabel('Apagar e recriar').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_auto_force').setLabel('Criar ao lado').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('setup_home').setLabel('Cancelar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
    );

    return safeUpdate(interaction, { embeds: [embed], components: [row] });
  }

  return criarCanaisAgora(interaction, { apagarAntes: false });
}

async function criarCanaisAgora(interaction, { apagarAntes = false } = {}) {
  const guild = interaction.guild;
  const config = await getGuildConfig(guild.id);

  if (apagarAntes) {
    const antigos = [config.logsChannelId, config.transcriptChannelId, config.categoryId].filter(Boolean);
    for (const id of antigos) {
      const ch = guild.channels.cache.get(id);
      if (ch) await ch.delete().catch(() => {});
    }
    await updateGuildConfig(guild.id, {
      categoryId: null, logsChannelId: null, transcriptChannelId: null
    });
  }

  const staffRoles = config.staffRoles;
  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoles.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] }))
  ];

  const cat = await guild.channels.create({
    name: '📩 Tickets',
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites
  });

  const logs = await guild.channels.create({
    name: '📝 ticket-logs',
    type: ChannelType.GuildText,
    parent: cat.id,
    topic: 'Registo de eventos dos tickets (Pratic Bot)'
  });

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
      `> ${EMOJI.category} <#${cat.id}>\n` +
      `> ${EMOJI.logs} <#${logs.id}>\n` +
      `> ${EMOJI.transcripts} <#${trans.id}>\n\n` +
      '**Próximo passo:** cria um **Painel**.'
    )
    .setColor(BRAND.success).setFooter(footer()).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_painel_novo').setLabel('Criar Painel').setEmoji(EMOJI.add).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );

  return safeUpdate(interaction, { embeds: [embed], components: [row] });
}

async function autoReuse(interaction) {
  const config = await getGuildConfig(interaction.guildId);
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.success} Estrutura mantida`)
    .setDescription(
      `Mantive tudo como estava:\n\n` +
      `> ${EMOJI.category} <#${config.categoryId}>\n` +
      `> ${EMOJI.logs} <#${config.logsChannelId}>\n` +
      `> ${EMOJI.transcripts} <#${config.transcriptChannelId}>`
    )
    .setColor(BRAND.success).setFooter(footer());
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
  return safeUpdate(interaction, { embeds: [embed], components: [row] });
}

async function autoRecreate(interaction) {
  await interaction.deferUpdate().catch(() => {});
  return criarCanaisAgora(interaction, { apagarAntes: true });
}

async function autoForce(interaction) {
  await interaction.deferUpdate().catch(() => {});
  return criarCanaisAgora(interaction, { apagarAntes: false });
}

// ============================================================
// SECÇÕES
// ============================================================
async function renderLogs(i) {
  await i.deferUpdate().catch(() => {});
  const locale = (await getGuildConfig(i.guildId)).locale || 'pt-PT';
  const s = new ChannelSelectMenuBuilder().setCustomId('setup_select_logs')
    .setPlaceholder(`${EMOJI.logs} ${t(locale, 'wizard.btn.logs')}`)
    .addChannelTypes(ChannelType.GuildText).setMinValues(1).setMaxValues(1);
  const e = sec(t(locale, 'wizard.sec.logs.title'), t(locale, 'wizard.sec.logs.body'));
  return i.editReply({
    embeds: [e],
    components: [new ActionRowBuilder().addComponents(s), backRow(t(locale, 'wizard.btn.back'))]
  }).catch(() => {});
}

async function renderTranscripts(i) {
  await i.deferUpdate().catch(() => {});
  const locale = (await getGuildConfig(i.guildId)).locale || 'pt-PT';
  const s = new ChannelSelectMenuBuilder().setCustomId('setup_select_transcripts')
    .setPlaceholder(`${EMOJI.transcripts} ${t(locale, 'wizard.btn.transcripts')}`)
    .addChannelTypes(ChannelType.GuildText).setMinValues(1).setMaxValues(1);
  const e = sec(t(locale, 'wizard.sec.transcripts.title'), t(locale, 'wizard.sec.transcripts.body'));
  return i.editReply({
    embeds: [e],
    components: [new ActionRowBuilder().addComponents(s), backRow(t(locale, 'wizard.btn.back'))]
  }).catch(() => {});
}

async function renderCategoria(i) {
  await i.deferUpdate().catch(() => {});
  const locale = (await getGuildConfig(i.guildId)).locale || 'pt-PT';
  const s = new ChannelSelectMenuBuilder().setCustomId('setup_select_categoria')
    .setPlaceholder(`${EMOJI.category} ${t(locale, 'wizard.btn.category')}`)
    .addChannelTypes(ChannelType.GuildCategory).setMinValues(1).setMaxValues(1);
  const e = sec(t(locale, 'wizard.sec.category.title'), t(locale, 'wizard.sec.category.body'));
  return i.editReply({
    embeds: [e],
    components: [new ActionRowBuilder().addComponents(s), backRow(t(locale, 'wizard.btn.back'))]
  }).catch(() => {});
}

async function renderStaff(i) {
  await i.deferUpdate().catch(() => {});
  const config = await getGuildConfig(i.guildId);
  const locale = config.locale || 'pt-PT';

  const menu = new RoleSelectMenuBuilder()
    .setCustomId('setup_select_staff')
    .setPlaceholder(`${EMOJI.staff} ${t(locale, 'wizard.btn.staff')}`)
    .setMinValues(0).setMaxValues(10);

  if (config.staffRoles.length) menu.setDefaultRoles(...config.staffRoles.slice(0, 10));

  const atual = config.staffRoles.length
    ? config.staffRoles.map(r => `> <@&${r}>`).join('\n')
    : `> ${t(locale, 'wizard.sec.staff.empty')}`;

  const e = new EmbedBuilder()
    .setTitle(t(locale, 'wizard.sec.staff.title'))
    .setDescription(`${t(locale, 'wizard.sec.staff.current')}\n${atual}\n\n${t(locale, 'wizard.sec.staff.hint')}`)
    .setColor(BRAND.color).setFooter(footer());

  return i.editReply({
    embeds: [e],
    components: [
      new ActionRowBuilder().addComponents(menu),
      backRow(t(locale, 'wizard.btn.back'))
    ]
  }).catch(() => {});
}

async function renderIdioma(i) {
  await i.deferUpdate().catch(() => {});
  const locale = (await getGuildConfig(i.guildId)).locale || 'pt-PT';

  const s = new StringSelectMenuBuilder().setCustomId('setup_select_idioma')
    .setPlaceholder(`${EMOJI.language} ${t(locale, 'wizard.btn.language')}`)
    .addOptions(
      { label: 'Português (PT)', value: 'pt-PT', emoji: '🇵🇹', default: locale === 'pt-PT' },
      { label: 'Português (BR)', value: 'pt-BR', emoji: '🇧🇷', default: locale === 'pt-BR' },
      { label: 'Español',         value: 'es-ES', emoji: '🇪🇸', default: locale === 'es-ES' },
      { label: 'Русский',         value: 'ru',    emoji: '🇷🇺', default: locale === 'ru' },
      { label: 'English',         value: 'en',    emoji: '🇬🇧', default: locale === 'en' }
    );

  const e = new EmbedBuilder()
    .setTitle(t(locale, 'wizard.sec.language.title'))
    .setDescription(t(locale, 'wizard.sec.language.body'))
    .setColor(BRAND.color).setFooter(footer());

  return i.editReply({
    embeds: [e],
    components: [
      new ActionRowBuilder().addComponents(s),
      backRow(t(locale, 'wizard.btn.back'))
    ]
  }).catch(() => {});
}

// ============================================================
// 🎨 BRANDING
// ============================================================
async function renderBranding(i) {
  await i.deferUpdate().catch(() => {});
  const config = await getGuildConfig(i.guildId);

  if (!temBranding(config)) {
    const embed = sec('🎨 Branding personalizado',
      `${EMOJI.warning} **Disponível apenas nos planos Pro, Premium e Custom.**\n\n` +
      '**O que ganhas:**\n' +
      '> • Nome próprio do bot\n' +
      '> • Avatar personalizado\n' +
      '> • Banner nas DMs\n' +
      '> • Cor personalizada\n\n' +
      '💡 Os teus membros reconhecem a comunidade nas DMs.',
      BRAND.warning);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_plano').setLabel('Ver planos').setEmoji(EMOJI.premium).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
    );
    return i.editReply({ embeds: [embed], components: [row] }).catch(() => {});
  }

  const b = config.branding || {};
  const embed = sec('🎨 Branding personalizado',
    `**Nome:** ${b.botName ? `\`${b.botName}\`` : '`Pratic Bot` (default)'}\n` +
    `**Avatar:** ${b.avatarUrl ? '✅' : '❌'}\n` +
    `**Banner:** ${b.bannerUrl ? '✅' : '❌'}\n` +
    `**Cor:** \`${b.color || '#5865f2'}\`\n` +
    `**Descrição:** ${b.description ? `\`${b.description}\`` : '❌'}`,
    BRAND.purple);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_brand_edit').setLabel('Editar').setEmoji('✏️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_brand_reset').setLabel('Resetar').setEmoji(EMOJI.trash).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
  return i.editReply({ embeds: [embed], components: [row] }).catch(() => {});
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
      .setCustomId('description').setLabel('Descrição da comunidade').setStyle(TextInputStyle.Short)
      .setRequired(false).setMaxLength(120).setValue(b.description || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('avatarUrl').setLabel('URL do avatar').setStyle(TextInputStyle.Short)
      .setRequired(false).setValue(b.avatarUrl || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('bannerUrl').setLabel('URL do banner').setStyle(TextInputStyle.Short)
      .setRequired(false).setValue(b.bannerUrl || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('color').setLabel('Cor em hex (ex: #ff6b6b)').setStyle(TextInputStyle.Short)
      .setRequired(false).setMaxLength(7).setValue(b.color || '#5865f2'))
  );
  return i.showModal(modal);
}

async function guardarBranding(i) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  if (!lim.branding) {
    return safeReply(i, { content: `${EMOJI.error} O teu plano não suporta branding.`, ephemeral: true });
  }

  const cor = i.fields.getTextInputValue('color').trim();
  if (cor && !/^#[0-9a-fA-F]{6}$/.test(cor)) {
    return safeReply(i, { content: `${EMOJI.error} Cor inválida (usa \`#RRGGBB\`).`, ephemeral: true });
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
    .setDescription(`**${branding.botName || 'Pratic Bot'}** ativo nesta comunidade.`)
    .setColor(branding.color).setFooter(footer()).setTimestamp();

  if (branding.bannerUrl) embed.setImage(branding.bannerUrl);
  if (branding.avatarUrl) embed.setThumbnail(branding.avatarUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_branding').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
  return safeReply(i, { embeds: [embed], components: [row], ephemeral: true });
}

async function resetarBranding(i) {
  await updateGuildConfig(i.guildId, {
    branding: { botName: null, avatarUrl: null, bannerUrl: null, description: null, color: '#5865f2', status: null }
  });
  return renderBranding(i);
}

// ============================================================
// 💎 PLANOS
// ============================================================
async function renderPlano(i) {
  await i.deferUpdate().catch(() => {});
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
      { name: 'Plano', value: `**${lim.nome}**${lim.preco ? ` — €${lim.preco}/mês` : ' (grátis)'}`, inline: true },
      { name: 'Estado', value: expiraEm ? `Ativo · **${diasRestantes}d**` : (config.tier === 'free' ? 'Gratuito' : '—'), inline: true },
      { name: 'Expira', value: expiraEm ? `<t:${Math.floor(expiraEm.getTime()/1000)}:R>` : '—', inline: true },
      { name: `${EMOJI.panel} Painéis`, value: `\`${uso}\``, inline: true },
      { name: 'Opções/painel', value: `\`${lim.maxOptions}\``, inline: true },
      { name: 'Botões/ticket', value: `\`${lim.maxButtons}\``, inline: true },
      { name: `${EMOJI.transcripts} Msgs/transcript`, value: `\`${maxM}\``, inline: true },
      { name: `${EMOJI.star} Avaliações`, value: lim.rating ? '✅' : '❌', inline: true },
      { name: '🎨 Branding', value: lim.branding ? '✅' : '❌', inline: true }
    )
    .setColor(lim.branding ? BRAND.purple : BRAND.color)
    .setFooter(footer()).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_ativar_chave').setLabel('Ativar chave').setEmoji('🔑').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_planos').setLabel('Ver planos').setEmoji(EMOJI.premium).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );

  return i.editReply({ embeds: [embed], components: [row] }).catch(() => {});
}

async function renderPlanos(i) {
  await i.deferUpdate().catch(() => {});
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.premium} Planos disponíveis`)
    .setDescription(
      '**Todos incluem:** sistema completo de tickets · multi-idioma · painéis configuráveis · transcripts HTML/TXT.\n\u200b'
    )
    .addFields(
      { name: `🆓 Free — €0`,         value: '`8 painéis` · `4 opções` · `4 botões` · `990 msgs` · avaliações · sem marca', inline: false },
      { name: `🔵 Básico — €5/mês`,   value: '`20 painéis` · `2.990 msgs` · formulários · respostas rápidas · sem marca', inline: false },
      { name: `🟣 Pro — €12/mês`,     value: '`50 painéis` · `9.990 msgs` · DMs automáticas · auto-fecho · analytics · ranking staff · 🎨 branding', inline: false },
      { name: `🟡 Premium — €15/mês`, value: '`∞ painéis` · `∞ msgs` · **white-label** · tudo desbloqueado', inline: false },
      { name: `🛠️ Custom — €20/mês`,  value: 'Tudo do Premium + **bot personalizado** · configuração feita por nós · suporte prioritário', inline: false }
    )
    .setColor(BRAND.gold).setFooter(footer()).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_ativar_chave').setLabel('Ativar chave').setEmoji('🔑').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );
  return i.editReply({ embeds: [embed], components: [row] }).catch(() => {});
}

async function abrirModalChave(i) {
  const modal = new ModalBuilder().setCustomId('setup_modal_chave').setTitle('🔑 Ativar plano');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('chave').setLabel('Chave').setStyle(TextInputStyle.Short)
      .setRequired(true).setMaxLength(40).setPlaceholder('PRO-XXXX-YYYY')
  ));
  return i.showModal(modal);
}

// ============================================================
// 🗂️ PAINÉIS — LISTA
// ============================================================
async function renderPaineis(i) {
  await i.deferUpdate().catch(() => {});
  const config = await getGuildConfig(i.guildId);
  const limits = getLimits(config.tier);
  const maxP = limits.maxPanels === 999 ? '∞' : limits.maxPanels;

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.panels} Painéis (${config.panels.length}/${maxP})`)
    .setColor(BRAND.color).setFooter(footer()).setTimestamp();

  if (!config.panels.length) {
    embed.setDescription(
      '**Ainda não tens painéis.**\n\n' +
      `> ${EMOJI.arrow} Clica em **Criar Painel** para começar.`
    );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_painel_novo').setLabel('Criar Painel').setEmoji(EMOJI.add).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
    );
    return i.editReply({ embeds: [embed], components: [row] }).catch(() => {});
  }

  embed.setDescription(
    config.panels.map((p, n) => {
      const pronto = p.options.length > 0;
      return `**${n + 1}. ${p.nome}** ${pronto ? '🟢' : '🔴'}\n` +
        `> \`${p.id}\` · ${p.options.length}/${limits.maxOptions} opções`;
    }).join('\n\n')
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('setup_envio_choose')
    .setPlaceholder('➜ Escolhe um painel')
    .addOptions(config.panels.slice(0, 25).map(p => ({
      label: p.nome.slice(0, 100),
      value: p.id,
      description: `${p.options.length} opções`.slice(0, 100),
      emoji: p.options.length ? '🟢' : '🔴'
    })));

  const row1 = new ActionRowBuilder().addComponents(select);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_painel_novo').setLabel('Criar Painel').setEmoji(EMOJI.add).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Voltar').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );

  return i.editReply({ embeds: [embed], components: [row1, row2] }).catch(() => {});
}

// ============================================================
// 🎛️ EDITOR DE PAINEL
// ============================================================
async function renderPainelEditor(i, panelId, { asReply = false } = {}) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  const panel = config.panels.find(p => p.id === panelId);
  if (!panel) {
    return safeReply(i, { content: '❌ Painel não encontrado.', ephemeral: true });
  }

  const opcoes = panel.options.length
    ? panel.options.map((o, n) => `> **${n + 1}.** ${o.emoji ? o.emoji + ' ' : ''}${o.label}  ·  \`${o.value}\``).join('\n')
    : '> *Nenhuma opção. Adiciona a primeira abaixo.*';

  const embed = new EmbedBuilder()
    .setAuthor({ name: config.branding?.botName || BRAND.name })
    .setTitle(`${EMOJI.panel} ${panel.nome}`)
    .setDescription(
      `**Título:** ${panel.title}\n` +
      `**Descrição:** ${panel.descricao}\n` +
      `**Cor:** \`${panel.color}\`\n\n` +
      `**Opções (${panel.options.length}/${lim.maxOptions}):**\n${opcoes}`
    )
    .setColor(panel.color || BRAND.color)
    .setFooter(footer('Editor'))
    .setTimestamp();

  const rows = [];

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`setup_panel_addopt_${panel.id}`)
      .setLabel('Adicionar')
      .setEmoji(EMOJI.add)
      .setStyle(ButtonStyle.Success)
      .setDisabled(panel.options.length >= lim.maxOptions),
    new ButtonBuilder()
      .setCustomId(`setup_panel_publish_${panel.id}`)
      .setLabel('Publicar')
      .setEmoji('📤')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(panel.options.length === 0),
    new ButtonBuilder()
      .setCustomId(`setup_panel_delete_${panel.id}`)
      .setLabel('Apagar')
      .setEmoji(EMOJI.trash)
      .setStyle(ButtonStyle.Danger)
  ));

  if (panel.options.length > 0) {
    const del = panel.options.slice(0, 5).map((o, n) =>
      new ButtonBuilder()
        .setCustomId(`setup_panel_delopt_${panel.id}_${n}`)
        .setLabel(`${n + 1}. ${o.label.slice(0, 15)}`)
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(new ActionRowBuilder().addComponents(del));
  }

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_paineis').setLabel('Ver todos').setEmoji(EMOJI.panels).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup_home').setLabel('Início').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  ));

  const payload = { embeds: [embed], components: rows, ephemeral: true };

  if (asReply) return safeReply(i, payload);
  return safeUpdate(i, payload);
}

async function abrirModalAddOpcao(i, panelId) {
  const modal = new ModalBuilder()
    .setCustomId(`setup_modal_addopt_${panelId}`)
    .setTitle('➕ Nova opção');

  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('label').setLabel('Texto visível').setStyle(TextInputStyle.Short)
      .setRequired(true).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('value').setLabel('Valor interno (a-z, 0-9)').setStyle(TextInputStyle.Short)
      .setRequired(true).setMaxLength(50)),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('emoji').setLabel('Emoji (opcional)').setStyle(TextInputStyle.Short)
      .setRequired(false).setMaxLength(4))
  );
  return i.showModal(modal);
}

async function guardarOpcao(i) {
  const panelId = i.customId.replace('setup_modal_addopt_', '');
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  const panel = config.panels.find(p => p.id === panelId);
  if (!panel) return safeReply(i, { content: '❌ Painel não encontrado.', ephemeral: true });

  if (panel.options.length >= lim.maxOptions) {
    return safeReply(i, { content: `${EMOJI.error} Limite de ${lim.maxOptions} opções.`, ephemeral: true });
  }

  const label = i.fields.getTextInputValue('label').slice(0, 80);
  const rawValue = i.fields.getTextInputValue('value');
  const value = rawValue.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 50);
  const emoji = (i.fields.getTextInputValue('emoji') || '').trim() || undefined;

  if (!value) return safeReply(i, { content: '❌ Valor inválido.', ephemeral: true });
  if (panel.options.some(o => o.value === value)) {
    return safeReply(i, { content: `❌ Já existe \`${value}\`.`, ephemeral: true });
  }

  panel.options.push({ label, value, ...(emoji && { emoji }) });
  await updateGuildConfig(i.guildId, { panels: config.panels });

  return renderPainelEditor(i, panelId, { asReply: true });
}

async function apagarOpcao(i, panelId, idx) {
  const config = await getGuildConfig(i.guildId);
  const panel = config.panels.find(p => p.id === panelId);
  if (!panel) return safeReply(i, { content: '❌ Painel não encontrado.', ephemeral: true });
  panel.options.splice(idx, 1);
  await updateGuildConfig(i.guildId, { panels: config.panels });
  return renderPainelEditor(i, panelId);
}

async function apagarPainel(i, panelId) {
  const config = await getGuildConfig(i.guildId);
  config.panels = config.panels.filter(p => p.id !== panelId);
  await updateGuildConfig(i.guildId, { panels: config.panels });
  return renderPaineis(i);
}

async function renderEnvioCanalPainel(i, panelId) {
  await i.deferUpdate().catch(() => {});
  const config = await getGuildConfig(i.guildId);
  const panel = config.panels.find(p => p.id === panelId);
  if (!panel) return safeReply(i, { content: '❌ Painel não encontrado.', ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle(`📤 Publicar **${panel.nome}**`)
    .setDescription(`> ${panel.options.length} opções\n\n**Escolhe o canal:**`)
    .setColor(panel.color || BRAND.color).setFooter(footer());

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`setup_envio_channel_${panel.id}`)
    .setPlaceholder('📢 Escolhe o canal')
    .addChannelTypes(ChannelType.GuildText)
    .setMinValues(1).setMaxValues(1);

  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`setup_panel_edit_${panel.id}`).setLabel('Voltar ao editor').setEmoji(EMOJI.back).setStyle(ButtonStyle.Secondary)
  );

  return i.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(channelSelect), back]
  }).catch(() => {});
}

async function enviarPainelFinal(i, panelId) {
  const config = await getGuildConfig(i.guildId);
  const limits = getLimits(config.tier);
  const panel = config.panels.find(p => p.id === panelId);
  if (!panel) return safeReply(i, { content: '❌ Painel não encontrado.', ephemeral: true });

  const canal = i.guild.channels.cache.get(i.values[0]);
  if (!canal) return safeReply(i, { content: '❌ Canal não encontrado.', ephemeral: true });

  const unique = [];
  const seen = new Set();
  for (const o of panel.options) {
    const v = o.value.slice(0, 100);
    if (seen.has(v)) continue;
    seen.add(v);
    const opt = { label: o.label.slice(0, 100), value: v };
    if (o.emoji) opt.emoji = o.emoji;
    unique.push(opt);
    if (unique.length >= 10) break;
  }

  const embed = new EmbedBuilder()
    .setTitle(panel.title)
    .setDescription(panel.descricao)
    .setTimestamp();

  aplicarBranding(embed, config, { color: panel.color || '#5865f2' });
  if (limits.watermark) embed.setFooter({ text: 'Pratic Bot' });

  const select = new StringSelectMenuBuilder().setCustomId(`panel_${panel.id}`)
    .setPlaceholder('Escolhe uma opção')
    .addOptions(unique);

  await canal.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });

  return safeReply(i, { content: `${EMOJI.success} Painel **${panel.nome}** enviado para <#${canal.id}>!`, ephemeral: true });
}

async function renderEnvioCanal(i) {
  const panelId = i.values[0];
  return renderEnvioCanalPainel(i, panelId);
}

// ============================================================
// 🎫 CRIAR PAINEL
// ============================================================
async function abrirModalPainel(i) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  if (config.panels.length >= lim.maxPanels) {
    return safeReply(i, { content: `${EMOJI.error} Limite de **${lim.maxPanels}** painéis do plano ${lim.nome}.`, ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId('setup_modal_panel_create')
    .setTitle('🎫 Criar Painel');

  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('nome').setLabel('Nome interno (ex: Suporte)')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('titulo').setLabel('Título do embed')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('descricao').setLabel('Descrição do embed')
      .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
    new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId('cor').setLabel('Cor em hex (ex: #5865f2)')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(7))
  );
  return i.showModal(modal);
}

async function guardarPainel(i) {
  const config = await getGuildConfig(i.guildId);
  const lim = getLimits(config.tier);
  if (config.panels.length >= lim.maxPanels) {
    return safeReply(i, { content: `${EMOJI.error} Limite atingido.`, ephemeral: true });
  }

  const nome = i.fields.getTextInputValue('nome').slice(0, 50);
  const titulo = i.fields.getTextInputValue('titulo').slice(0, 100);
  const descricao = i.fields.getTextInputValue('descricao').slice(0, 500);
  const corIn = (i.fields.getTextInputValue('cor') || '').trim();
  const cor = /^#[0-9a-fA-F]{6}$/.test(corIn) ? corIn : '#5865f2';
  const id = `p_${Date.now().toString(36)}`;

  config.panels.push({ id, nome, title: titulo, descricao, color: cor, options: [] });
  await updateGuildConfig(i.guildId, { panels: config.panels });

  return renderPainelEditor(i, id, { asReply: true });
}

// ============================================================
// 🧪 TESTE + AJUDA
// ============================================================
async function renderTeste(i) {
  await i.deferUpdate().catch(() => {});
  const c = await getGuildConfig(i.guildId);
  const checks = [
    { ok: !!canalOuNull(i.guild, c.logsChannelId),       label: `${EMOJI.logs} Logs` },
    { ok: !!canalOuNull(i.guild, c.transcriptChannelId), label: `${EMOJI.transcripts} Transcripts` },
    { ok: !!canalOuNull(i.guild, c.categoryId),          label: `${EMOJI.category} Categoria` },
    { ok: !!c.staffRoles.length,                          label: `${EMOJI.staff} Staff` },
    { ok: !!c.panels.length,                              label: `${EMOJI.panel} Painel criado` }
  ];
  const passou = checks.filter(x => x.ok).length;
  const ok = passou === checks.length;
  const desc = checks.map(x => `${x.ok ? EMOJI.success : EMOJI.error} ${x.label}`).join('\n') +
    `\n\n**Resultado:** \`${passou}/${checks.length}\``;

  const embed = sec(`${EMOJI.test} Teste`, desc, ok ? BRAND.success : BRAND.warning);
  return i.editReply({ embeds: [embed], components: [backRow('Voltar')] }).catch(() => {});
}

async function renderAjuda(i) {
  await i.deferUpdate().catch(() => {});
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.help} Ajuda do ${BRAND.name}`)
    .setDescription(
      '**Ordem recomendada:**\n```\n' +
      '1. 🪄 Criar canais automáticos\n' +
      '2. 🛡️ Selecionar cargos de Staff\n' +
      '3. 🌐 Escolher idioma\n' +
      '4. 🎫 Criar painel\n' +
      '5. 💎 (Opcional) Ativar plano\n' +
      '6. 🎨 (Pro+) Personalizar branding\n```'
    ).setColor(BRAND.color).setFooter(footer()).setTimestamp();
  return i.editReply({ embeds: [embed], components: [backRow('Voltar')] }).catch(() => {});
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
export async function handleSetupInteraction(interaction) {
  const { customId } = interaction;

  // ---- MODAIS ----
  if (interaction.isModalSubmit()) {
    if (customId === 'setup_modal_panel_create')       return guardarPainel(interaction);
    if (customId === 'setup_modal_brand')              return guardarBranding(interaction);
    if (customId.startsWith('setup_modal_addopt_'))    return guardarOpcao(interaction);
    if (customId === 'setup_modal_chave') {
      const { processarChaveModal } = await import('./keysManager.js');
      return processarChaveModal(interaction);
    }
    return;
  }

  // ---- NAVEGAÇÃO ----
  if (customId === 'setup_home')         return renderHome(interaction);
  if (customId === 'setup_paineis')      return renderPaineis(interaction);
  if (customId === 'setup_teste')        return renderTeste(interaction);
  if (customId === 'setup_ajuda')        return renderAjuda(interaction);
  if (customId === 'setup_plano')        return renderPlano(interaction);
  if (customId === 'setup_planos')       return renderPlanos(interaction);
  if (customId === 'setup_branding')     return renderBranding(interaction);
  if (customId === 'setup_brand_edit')   return abrirModalBranding(interaction);
  if (customId === 'setup_brand_reset')  return resetarBranding(interaction);
  if (customId === 'setup_ativar_chave') return abrirModalChave(interaction);

  // ---- SECÇÕES ----
  if (customId === 'setup_logs')         return renderLogs(interaction);
  if (customId === 'setup_transcripts')  return renderTranscripts(interaction);
  if (customId === 'setup_categoria')    return renderCategoria(interaction);
  if (customId === 'setup_staff')        return renderStaff(interaction);
  if (customId === 'setup_idioma')       return renderIdioma(interaction);

  // ---- AÇÕES ----
  if (customId === 'setup_painel_novo')  return abrirModalPainel(interaction);
  if (customId === 'setup_auto')         return autoCriarCanais(interaction);
  if (customId === 'setup_auto_reuse')   return autoReuse(interaction);
  if (customId === 'setup_auto_recreate')return autoRecreate(interaction);
  if (customId === 'setup_auto_force')   return autoForce(interaction);

  // ---- EDITOR DE PAINEL ----
  if (customId.startsWith('setup_panel_edit_'))    return renderPainelEditor(interaction, customId.replace('setup_panel_edit_', ''));
  if (customId.startsWith('setup_panel_addopt_'))  return abrirModalAddOpcao(interaction, customId.replace('setup_panel_addopt_', ''));
  if (customId.startsWith('setup_panel_publish_')) return renderEnvioCanalPainel(interaction, customId.replace('setup_panel_publish_', ''));
  if (customId.startsWith('setup_panel_delete_'))  return apagarPainel(interaction, customId.replace('setup_panel_delete_', ''));
  if (customId.startsWith('setup_panel_delopt_')) {
    const rest = customId.replace('setup_panel_delopt_', '');
    const lastUnderscore = rest.lastIndexOf('_');
    const pid = rest.slice(0, lastUnderscore);
    const idx = parseInt(rest.slice(lastUnderscore + 1));
    return apagarOpcao(interaction, pid, idx);
  }

  // ---- SELECTS ----
  if (customId === 'setup_select_logs') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { logsChannelId: id });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_transcripts') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { transcriptChannelId: id });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_categoria') {
    const id = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { categoryId: id });
    return renderHome(interaction);
  }
  if (customId === 'setup_select_staff') {
    const ids = interaction.values;
    await updateGuildConfig(interaction.guildId, { staffRoles: ids });
    return renderStaff(interaction);
  }
  if (customId === 'setup_select_idioma') {
    const loc = interaction.values[0];
    await updateGuildConfig(interaction.guildId, { locale: loc });
    return renderHome(interaction);
  }
  if (customId === 'setup_envio_choose') return renderEnvioCanal(interaction);
  if (customId.startsWith('setup_envio_channel_')) {
    return enviarPainelFinal(interaction, customId.replace('setup_envio_channel_', ''));
  }
}
