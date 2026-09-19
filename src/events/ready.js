import { iniciarAutoClose } from '../services/autoClose.js';
import { iniciarVerificacaoExpiracao } from '../services/keysManager.js';

export async function handleReady(client) {
  console.log(`✅ Pratic Bot online: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  client.user.setPresence({
    activities: [{ name: '/setup | Pratic Bot' }],
    status: 'online'
  });
  iniciarAutoClose(client);
  iniciarVerificacaoExpiracao(client);
}
