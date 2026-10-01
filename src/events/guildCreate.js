import { EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../database/guildConfig.js';

export async function handleGuildCreate(guild) {
  await getGuildConfig(guild.id);
  try {
    const owner = await guild.fetchOwner();
    await owner.send({
      embeds: [new EmbedBuilder()
        .setTitle('👋 Pratic Bot adicionado!')
        .setDescription(
          'Usa `/pratic` para configurar em minutos.\n\n' +
          '**Planos:**\n' +
          '🆓 Free — €0\n' +
          '🔵 Básico — €5/mês\n' +
          '🟣 Pro — €12/mês\n' +
          '🟡 Premium — €15/mês\n' +
          '🛠️ Custom — €20/mês\n\n' +
          '**Idiomas:** PT-PT · PT-BR · ES · RU · EN'
        )
        .setColor('#5865f2')]
    }).catch(() => {});
  } catch {}
}
