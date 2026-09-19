import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

// ============================================================
// CARGOS (IDs reais do teu servidor)
// ============================================================
const ROLES = [
  {
    id: '1550966636733792356',
    nome: '👑 Dono',
    cor: 0xE74C3C,
    hoist: true,
    mentionable: false,
    perms: ['Administrator']
  },
  {
    id: '1550966850295435275',
    nome: '🛠️ Coordenador',
    cor: 0xE67E22,
    hoist: true,
    mentionable: true,
    perms: [
      'ViewChannel', 'ManageChannels', 'ViewAuditLog',
      'CreateInstantInvite', 'ChangeNickname', 'ManageNicknames',
      'ModerateMembers', 'SendMessages', 'SendMessagesInThreads',
      'CreatePublicThreads', 'CreatePrivateThreads', 'EmbedLinks',
      'AttachFiles', 'AddReactions', 'UseExternalEmojis',
      'UseExternalStickers', 'ManageMessages', 'PinMessages',
      'MentionEveryone', 'ManageThreads', 'ReadMessageHistory',
      'UseApplicationCommands', 'UseActivities',
      'CreateEvents', 'ManageEvents', 'UseSoundboard',
      'UseExternalSounds', 'UseVAD', 'Connect', 'Speak',
      'Stream', 'SendVoiceMessages'
    ]
  },
  {
    id: '1550966912392101958',
    nome: '🔧 Gestor',
    cor: 0x2ECC71,
    hoist: true,
    mentionable: true,
    perms: [
      'ViewChannel', 'ViewAuditLog', 'CreateInstantInvite',
      'ChangeNickname', 'KickMembers', 'BanMembers',
      'ModerateMembers', 'SendMessages', 'SendMessagesInThreads',
      'CreatePublicThreads', 'CreatePrivateThreads', 'EmbedLinks',
      'AttachFiles', 'AddReactions', 'UseExternalEmojis',
      'UseExternalStickers', 'ManageMessages', 'PinMessages',
      'ManageThreads', 'ReadMessageHistory',
      'UseApplicationCommands', 'UseActivities',
      'UseSoundboard', 'UseExternalSounds', 'UseVAD',
      'Connect', 'Speak', 'Stream', 'SendVoiceMessages'
    ]
  },
  {
    id: '1550966980637364284',
    nome: '🛡️ Moderador',
    cor: 0x3498DB,
    hoist: true,
    mentionable: true,
    perms: [
      'ViewChannel', 'ViewAuditLog', 'CreateInstantInvite',
      'ChangeNickname', 'ManageNicknames', 'KickMembers',
      'BanMembers', 'ModerateMembers', 'SendMessages',
      'SendMessagesInThreads', 'CreatePublicThreads',
      'EmbedLinks', 'AttachFiles', 'AddReactions',
      'UseExternalEmojis', 'UseExternalStickers',
      'ManageMessages', 'ManageThreads', 'ReadMessageHistory',
      'UseApplicationCommands', 'UseActivities',
      'UseVAD', 'Connect', 'Speak', 'Stream',
      'MuteMembers', 'DeafMembers', 'MoveMembers',
      'SendVoiceMessages'
    ]
  },
  {
    id: '1550967050757734470',
    nome: '🎫 Suporte',
    cor: 0xF1C40F,
    hoist: true,
    mentionable: true,
    perms: [
      'ViewChannel', 'SendMessages', 'SendMessagesInThreads',
      'EmbedLinks', 'AttachFiles', 'AddReactions',
      'UseExternalEmojis', 'UseExternalStickers',
      'ReadMessageHistory', 'UseApplicationCommands',
      'UseActivities', 'UseVAD', 'Connect', 'Speak',
      'Stream', 'SendVoiceMessages'
    ]
  },
  {
    id: '1550938967384260731',
    nome: '🤖 Pratic Bot',
    cor: 0x95A5A6,
    hoist: true,
    mentionable: false,
    perms: [
      'ViewChannel', 'SendMessages', 'SendMessagesInThreads',
      'EmbedLinks', 'AttachFiles', 'AddReactions',
      'UseExternalEmojis', 'UseExternalStickers',
      'ManageMessages', 'ManageThreads', 'ReadMessageHistory',
      'UseApplicationCommands'
    ]
  },
  {
    id: '1550967483937198102',
    nome: '⭐ Premium',
    cor: 0xF1C40F,
    hoist: true,
    mentionable: true,
    perms: [
      'ViewChannel', 'CreateInstantInvite', 'ChangeNickname',
      'SendMessages', 'SendMessagesInThreads',
      'CreatePublicThreads', 'CreatePrivateThreads',
      'EmbedLinks', 'AttachFiles', 'AddReactions',
      'UseExternalEmojis', 'UseExternalStickers',
      'ReadMessageHistory', 'UseApplicationCommands',
      'UseActivities', 'UseSoundboard', 'UseExternalSounds',
      'UseVAD', 'Connect', 'Speak', 'Stream'
    ]
  },
  {
    id: '1550967562957750272',
    nome: '🔵 Pro',
    cor: 0x5DADE2,
    hoist: true,
    mentionable: true,
    perms: [
      'ViewChannel', 'CreateInstantInvite', 'ChangeNickname',
      'SendMessages', 'SendMessagesInThreads',
      'CreatePublicThreads', 'EmbedLinks', 'AttachFiles',
      'AddReactions', 'UseExternalEmojis', 'UseExternalStickers',
      'ReadMessageHistory', 'UseApplicationCommands',
      'UseActivities', 'UseSoundboard', 'UseExternalSounds',
      'UseVAD', 'Connect', 'Speak', 'Stream'
    ]
  },
  {
    id: '1550967620730097734',
    nome: '🟣 Básico',
    cor: 0x9B59B6,
    hoist: true,
    mentionable: true,
    perms: [
      'ViewChannel', 'CreateInstantInvite', 'ChangeNickname',
      'SendMessages', 'SendMessagesInThreads',
      'CreatePublicThreads', 'EmbedLinks', 'AttachFiles',
      'AddReactions', 'UseExternalEmojis', 'UseExternalStickers',
      'ReadMessageHistory', 'UseApplicationCommands',
      'UseVAD', 'Connect', 'Speak', 'SendVoiceMessages'
    ]
  },
  {
    id: '1550967711335456870',
    nome: '👤 Membro',
    cor: 0xBDC3C7,
    hoist: false,
    mentionable: false,
    perms: [
      'ViewChannel', 'SendMessages', 'EmbedLinks',
      'AttachFiles', 'AddReactions', 'ReadMessageHistory',
      'UseVAD', 'Connect', 'Speak'
    ]
  }
];

// ============================================================
// APLICAR PERMISSÕES (não cria — só edita os existentes)
// ============================================================
export async function criarTodosCargos(interaction) {
  const guild = interaction.guild;

  const bot = guild.members.me;
  if (!bot.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: '❌ Preciso da permissão **Gerir Cargos** para editar roles.',
      ephemeral: true
    });
  }

  await interaction.reply({
    content: '⏳ **A aplicar permissões aos 10 cargos...** Isto demora ~20 segundos.',
    ephemeral: true
  });

  const aplicados = [];
  const naoEncontrados = [];
  const erros = [];

  for (const roleDef of ROLES) {
    try {
      // Procura o cargo APENAS pelo ID
      let role = guild.roles.cache.get(roleDef.id);

      // Se não estiver em cache, tenta fetch
      if (!role) {
        role = await guild.roles.fetch(roleDef.id).catch(() => null);
      }

      if (!role) {
        naoEncontrados.push(`${roleDef.nome} (ID: \`${roleDef.id}\`)`);
        continue;
      }

      // Converte perms para BigInt
      const permissions = roleDef.perms.map(p => {
        if (typeof p === 'bigint') return p;
        return PermissionFlagsBits[p] || 0n;
      });

      // Aplica tudo: nome, cor, hoist, mentionable, permissões
      await role.edit({
        name: roleDef.nome,
        color: roleDef.cor,
        hoist: roleDef.hoist,
        mentionable: roleDef.mentionable,
        permissions: permissions,
        reason: 'Setup Pratic Bot'
      });

      aplicados.push(`${roleDef.nome} — \`${role.id}\``);
    } catch (e) {
      console.error(`Erro em ${roleDef.nome}:`, e.message);
      erros.push(`${roleDef.nome}: ${e.message}`);
    }
  }

  // ============================================================
  // REPORT
  // ============================================================
  const embed = new EmbedBuilder()
    .setTitle('✅ Permissões Aplicadas')
    .setColor('#57f287')
    .setTimestamp();

  if (aplicados.length) {
    embed.addFields({
      name: `✅ Aplicados (${aplicados.length})`,
      value: aplicados.join('\n').slice(0, 1024)
    });
  }

  if (naoEncontrados.length) {
    embed.addFields({
      name: `⚠️ Não encontrados (${naoEncontrados.length})`,
      value: naoEncontrados.join('\n').slice(0, 1024) +
        '\n\n**Verifica se os IDs estão corretos** ou se o cargo ainda existe.'
    });
  }

  if (erros.length) {
    embed.addFields({
      name: `❌ Erros (${erros.length})`,
      value: erros.join('\n').slice(0, 1024)
    });
  }

  embed.addFields({
    name: '📌 Próximo passo',
    value:
      'Ordena os cargos manualmente:\n' +
      '**Configurações do Servidor → Cargos**\n\n' +
      'Arrasta para a ordem correta:\n' +
      '1. 👑 Dono\n' +
      '2. 🛠️ Coordenador\n' +
      '3. 🔧 Gestor\n' +
      '4. 🛡️ Moderador\n' +
      '5. 🎫 Suporte\n' +
      '6. 🤖 Pratic Bot\n' +
      '7. ⭐ Premium\n' +
      '8. 🔵 Pro\n' +
      '9. 🟣 Básico\n' +
      '10. 👤 Membro'
  });

  return interaction.editReply({ content: null, embeds: [embed] });
}
