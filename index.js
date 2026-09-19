import 'dotenv/config';
import http from 'node:http';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { connectDB } from './src/database/mongo.js';
import { handleInteraction } from './src/events/interactionCreate.js';
import { handleReady } from './src/events/ready.js';
import { handleGuildCreate } from './src/events/guildCreate.js';

// ============================================================
// BOT DISCORD
// ============================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

await connectDB();

client.once('ready', () => handleReady(client));
client.on('interactionCreate', (i) => handleInteraction(i, client));
client.on('guildCreate', (g) => handleGuildCreate(g, client));

// ============================================================
// SERVIDOR HTTP — HEALTH CHECK (UptimeRobot)
// ============================================================
const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const uptime = Math.floor(process.uptime());
    const ready = client.isReady?.() ? 'ready' : 'starting';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      bot: client.user?.tag || 'offline',
      ready,
      uptime,
      servers: client.guilds?.cache?.size || 0,
      time: new Date().toISOString()
    }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🌐 Health check ativo em http://localhost:${PORT}/health`);
});

// ============================================================
// LOGIN
// ============================================================
client.login(process.env.TOKEN);

// ============================================================
// ERROS GLOBAIS
// ============================================================
process.on('unhandledRejection', (err) => console.error('[Unhandled]', err));
process.on('uncaughtException', (err) => console.error('[Uncaught]', err));
