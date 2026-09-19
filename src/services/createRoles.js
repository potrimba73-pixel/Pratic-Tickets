import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

// ============================================================
// CARGOS COM OS TEUS IDs REAIS
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
// APLICAR PERMISSÕES AOS CARGOS
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
    content: '⏳ **A configurar os 10 cargos...** Isto demora ~30 segundos.',
    ephemeral: true
  });

  const atualizados = [];
  const criados = [];
  const naoEncontrados = [];
  const erros = [];

  for (const roleDef of ROLES) {
    try {
      let role = guild.roles.cache.get(roleDef.id);

      // Se não encontrou pelo ID, tenta pelo nome
      if (!role) {
        role = guild.roles.cache.find(r => r.name === roleDef.nome);
      }

      // Converter perms para BigInt
      const permissions = roleDef.perms.map(p => {
        if (typeof p === 'bigint') return p;
        return PermissionFlagsBits[p] || 0n;
      });

      if (role) {
        await role.edit({
          name: roleDef.nome,
          color: roleDef.cor,
          hoist: roleDef.hoist,
          mentionable: roleDef.mentionable,
          permissions: permissions
        });
        atualizados.push(`${roleDef.nome} (\`${role.id}\`)`);
      } else {
        // Não existe → cria
        const newRole = await guild.roles.create({
          name: roleDef.nome,
          color: roleDef.cor,
          hoist: roleDef.hoist,
          mentionable: roleDef.mentionable,
          permissions: permissions,
          reason: 'Setup automático Pratic Bot'
        });
        criados.push(`${roleDef.nome} (\`${newRole.id}\`)`);
      }
    } catch (e) {
      console.error(`Erro em ${roleDef.nome}:`, e.message);
      erros.push(`${roleDef.nome}: ${e.message}`);
    }
  }

  // ============================================================
  // REPORT
  // ============================================================
  const embed = new EmbedBuilder()
    .setTitle('✅ Cargos Configurados')
    .setColor('#57f287')
    .setTimestamp();

  if (atualizados.length) {
    embed.addFields({
      name: `🔄 Atualizados (${atualizados.length})`,
      value: atualizados.join('\n').slice(0, 1024)
    });
  }

  if (criados.length) {
    embed.addFields({
      name: `🆕 Criados (${criados.length})`,
      value: criados.join('\n').slice(0, 1024)
    });
  }

  if (erros.length) {
    embed.addFields({
      name: `❌ Erros (${erros.length})`,
      value: erros.join('\n').slice(0, 1024)
    });
  }

  embed.addFields({
    name: '⚠️ Ordem dos cargos',
    value:
      'O Discord não permite ordenar por API. Arrasta manualmente em:\n' +
      '**Configurações → Cargos**\n\n' +
      'Ordem correta (topo → baixo):\n' +
      '1. 👑 Dono\n' +
      '2. 🛠️ Coordenador\n' +
      '3. 🔧 Gestor\n' +
      '4. 🛡️ Moderador\n' +
      '5. 🎫 Suporte\n' +
      '6. 🤖 Pratic Bot ← **deve estar acima dos planos**\n' +
      '7. ⭐ Premium\n' +
      '8. 🔵 Pro\n' +
      '9. 🟣 Básico\n' +
      '10. 👤 Membro'
  });

  return interaction.editReply({ content: null, embeds: [embed] });
}
