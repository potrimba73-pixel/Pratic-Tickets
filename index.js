import 'dotenv/config';
import http from 'node:http';
import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { connectDB } from './src/database/mongo.js';
import { handleInteraction } from './src/events/interactionCreate.js';
import { handleReady } from './src/events/ready.js';
import { handleGuildCreate } from './src/events/guildCreate.js';

// ============================================================
// COMANDOS (registados automaticamente)
// ============================================================
const cmds = [
  new SlashCommandBuilder().setName('setup').setDescription('Setup Pratic Bot').toJSON(),

  new SlashCommandBuilder().setName('config').setDescription('Configurar')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('ver').setDescription('Ver'))
    .addSubcommand(s => s.setName('logs').setDescription('Logs').addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(true)))
    .addSubcommand(s => s.setName('transcripts').setDescription('Transcripts').addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(true)))
    .addSubcommand(s => s.setName('staff').setDescription('Staff').addRoleOption(o => o.setName('cargo').setDescription('Cargo').setRequired(true)))
    .addSubcommand(s => s.setName('categoria').setDescription('Categoria').addChannelOption(o => o.setName('categoria').setDescription('Cat').setRequired(true)))
    .addSubcommand(s => s.setName('idioma').setDescription('Idioma').addStringOption(o => o.setName('locale').setDescription('Locale').setRequired(true)
      .addChoices({ name: 'Português (PT)', value: 'pt-PT' }, { name: 'Português (BR)', value: 'pt-BR' }, { name: 'Español', value: 'es-ES' }, { name: 'Русский', value: 'ru' }, { name: 'English', value: 'en' })))
    .toJSON(),

  
  new SlashCommandBuilder().setName('painel').setDescription('Painéis')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('criar').setDescription('Criar')
      .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
      .addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true))
      .addStringOption(o => o.setName('descricao').setDescription('Desc').setRequired(true)))
    .addSubcommand(s => s.setName('opcao').setDescription('Opção')
      .addStringOption(o => o.setName('painel_id').setDescription('ID').setRequired(true))
      .addStringOption(o => o.setName('label').setDescription('Label').setRequired(true))
      .addStringOption(o => o.setName('value').setDescription('Value').setRequired(true)))
    .addSubcommand(s => s.setName('listar').setDescription('Listar'))
    .addSubcommand(s => s.setName('enviar').setDescription('Enviar')
      .addStringOption(o => o.setName('painel_id').setDescription('ID').setRequired(true))
      .addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(true)))
    .addSubcommand(s => s.setName('apagar').setDescription('Apagar')
      .addStringOption(o => o.setName('painel_id').setDescription('ID').setRequired(true)))
    .toJSON(),

  new SlashCommandBuilder().setName('premium').setDescription('Ativar plano')
    .addStringOption(o => o.setName('chave').setDescription('Chave').setRequired(true)).toJSON(),

  new SlashCommandBuilder().setName('gerar-chave').setDescription('Gerar chave')
    .addStringOption(o => o.setName('tier').setDescription('Tier').setRequired(true)
      .addChoices({ name: 'Básico', value: 'basico' }, { name: 'Pro', value: 'pro' }, { name: 'Premium', value: 'premium' }))
    .addIntegerOption(o => o.setName('dias').setDescription('Dias').setMinValue(1).setMaxValue(365))
    .toJSON(),

  new SlashCommandBuilder().setName('admin-chaves').setDescription('Admin')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('stats').setDescription('Stats'))
    .addSubcommand(s => s.setName('listar').setDescription('Listar'))
    .addSubcommand(s => s.setName('revogar').setDescription('Revogar').addStringOption(o => o.setName('chave').setDescription('Chave').setRequired(true)))
    .toJSON()

        new SlashCommandBuilder().setName('criar-cargos').setDescription('🛠️ Cria todos os cargos do servidor automaticamente (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
];

// ============================================================
// BOT
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

client.once('clientReady', async () => {
  // ============================================================
  // REGISTAR COMANDOS AUTOMATICAMENTE
  // ============================================================
  try {
    console.log('🔄 A registar comandos slash...');
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: cmds });
    console.log(`✅ ${cmds.length} comandos registados!`);
  } catch (e) {
    console.error('❌ Erro ao registar comandos:', e.message);
  }

  handleReady(client);
});

client.on('interactionCreate', (i) => handleInteraction(i, client));
client.on('guildCreate', (g) => handleGuildCreate(g, client));

// ============================================================
// HEALTH CHECK
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

client.login(process.env.TOKEN);

process.on('unhandledRejection', (err) => console.error('[Unhandled]', err));
process.on('uncaughtException', (err) => console.error('[Uncaught]', err));
