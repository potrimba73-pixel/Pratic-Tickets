import 'dotenv/config';
import http from 'node:http';
import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { connectDB } from './src/database/mongo.js';
import { handleInteraction } from './src/events/interactionCreate.js';
import { handleReady } from './src/events/ready.js';
import { handleGuildCreate } from './src/events/guildCreate.js';
import { gerarErrorId, registarErro } from './src/utils/errorTracker.js';

// ============================================================
// 🎯 IDs FIXOS
// ============================================================
export const OWNER_ID  = '996454465555136675';       // o teu ID (dono)
export const HOME_GUILD = '1550930566054936787';     // servidor onde aparecem os comandos de admin

// ============================================================
// 🌍 COMANDOS GLOBAIS (todos os servidores)
// ============================================================
const cmdsGlobal = [
  new SlashCommandBuilder()
    .setName('pratic')
    .setDescription('🎫 Abre o painel de controlo do bot')
    .toJSON(),

  new SlashCommandBuilder().setName('painel').setDescription('Gerir painéis de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('criar').setDescription('Criar painel')
      .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
      .addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true))
      .addStringOption(o => o.setName('descricao').setDescription('Descrição').setRequired(true))
      .addStringOption(o => o.setName('cor').setDescription('Cor hex (ex: #5865f2)').setRequired(false)))
    .addSubcommand(s => s.setName('opcao').setDescription('Adicionar opção')
      .addStringOption(o => o.setName('painel_id').setDescription('ID do painel').setRequired(true))
      .addStringOption(o => o.setName('label').setDescription('Label').setRequired(true))
      .addStringOption(o => o.setName('value').setDescription('Valor').setRequired(true)))
    .addSubcommand(s => s.setName('listar').setDescription('Listar painéis'))
    .addSubcommand(s => s.setName('enviar').setDescription('Enviar painel')
      .addStringOption(o => o.setName('painel_id').setDescription('ID do painel').setRequired(true))
      .addChannelOption(o => o.setName('canal').setDescription('Canal').setRequired(true)))
    .addSubcommand(s => s.setName('apagar').setDescription('Apagar painel')
      .addStringOption(o => o.setName('painel_id').setDescription('ID').setRequired(true)))
    .toJSON()
];

// ============================================================
// 🏠 COMANDOS SÓ NO SERVIDOR HOME (staff)
// ============================================================
const cmdsHome = [
  new SlashCommandBuilder().setName('gerar-chave').setDescription('🔑 Gerar chave (dono)')
    .addStringOption(o => o.setName('tier').setDescription('Tier').setRequired(true)
      .addChoices(
        { name: 'Básico', value: 'basico' },
        { name: 'Pro', value: 'pro' },
        { name: 'Premium', value: 'premium' }
      ))
    .addIntegerOption(o => o.setName('dias').setDescription('Dias').setMinValue(1).setMaxValue(365))
    .toJSON(),

  new SlashCommandBuilder().setName('admin-chaves').setDescription('🔑 Admin chaves (dono)')
    .addSubcommand(s => s.setName('stats').setDescription('Estatísticas'))
    .addSubcommand(s => s.setName('listar').setDescription('Listar'))
    .addSubcommand(s => s.setName('revogar').setDescription('Revogar')
      .addStringOption(o => o.setName('chave').setDescription('Chave').setRequired(true)))
    .toJSON(),

  new SlashCommandBuilder().setName('erro').setDescription('🔍 Consultar erros (dono)')
    .addSubcommand(s => s.setName('ver').setDescription('Ver detalhes de um erro')
      .addStringOption(o => o.setName('id').setDescription('Código (ex: ERR-A3F9K)').setRequired(true)))
    .addSubcommand(s => s.setName('recentes').setDescription('Últimos 10 erros'))
    .toJSON(),

  new SlashCommandBuilder().setName('criar-cargos').setDescription('🛠️ Aplicar permissões aos cargos (dono)')
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
  try {
    console.log('🔄 A registar comandos slash...');
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    // 🌍 Globais
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: cmdsGlobal });
    console.log(`✅ ${cmdsGlobal.length} comandos GLOBAIS registados (todos os servidores)`);

    // 🏠 Home (guild específica)
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, HOME_GUILD),
      { body: cmdsHome }
    );
    console.log(`✅ ${cmdsHome.length} comandos HOME registados (só em ${HOME_GUILD})`);

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

// ============================================================
// ERROR TRACKING GLOBAL
// ============================================================
process.on('unhandledRejection', (err) => {
  const id = gerarErrorId();
  registarErro(id, err, { type: 'unhandledRejection' });
});

process.on('uncaughtException', (err) => {
  const id = gerarErrorId();
  registarErro(id, err, { type: 'uncaughtException' });
});
