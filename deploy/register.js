import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

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
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: cmds });
console.log('✅ Comandos registados.');
