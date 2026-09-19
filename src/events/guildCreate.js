import { EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../database/guildConfig.js';

export async function handleGuildCreate(guild) {
  await getGuildConfig(guild.id);
  try {
    const owner = await guild.fetchOwner();
    await owner.send({
      embeds: [new EmbedBuilder()
        .setTitle('👋 Pratic Bot adicionado!')
        .setDescription('Usa `/setup` para configurar.\n\n**Planos:**\n🔵 Básico €5\n🟣 Pro €10\n🟡 Premium €20\n\n**Idiomas:** PT · PT-BR · ES · RU · EN')
        .setColor('#5865f2')]
    }).catch(() => {});
  } catch {}
}
