import { getDB } from '../database/mongo.js';
import { getLimits, updateGuildConfig } from '../database/guildConfig.js';
import { EmbedBuilder } from 'discord.js';

export function iniciarAutoClose(client) {
  setInterval(async () => {
    try {
      const guilds = await getDB().collection('guilds').find({}).toArray();
      for (const config of guilds) {
        const limits = getLimits(config.tier);
        if (!limits.autoClose) continue;
        const horas = config.autoCloseHours || 48;
        const limite = Date.now() - horas * 3600000;

        for (const [channelId, ticket] of Object.entries(config.tickets || {})) {
          if (ticket.closed) continue;
          if (new Date(ticket.lastActivity || ticket.openedAt).getTime() > limite) continue;

          const guild = client.guilds.cache.get(config.guildId);
          if (!guild) continue;
          const channel = guild.channels.cache.get(channelId);
          if (!channel) continue;

          await channel.send({ embeds: [new EmbedBuilder().setTitle('⏰ Inativo').setDescription(`Fecha em 1 min (${horas}h).`).setColor('#faa61a')] }).catch(() => {});
          setTimeout(async () => {
            const ch = guild.channels.cache.get(channelId);
            if (ch) ch.delete().catch(() => {});
            ticket.closed = true;
            ticket.closedAt = new Date().toISOString();
            ticket.closedByName = 'Auto-Close';
            await updateGuildConfig(guild.id, { tickets: config.tickets });
          }, 60000);
        }
      }
    } catch (e) { console.error(e); }
  }, 15 * 60 * 1000);
}
