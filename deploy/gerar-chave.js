import 'dotenv/config';
import { connectDB } from '../src/database/mongo.js';
import { criarChave } from '../src/database/keys.js';

const tier = process.argv[2];
const dias = parseInt(process.argv[3]) || 30;

if (!['basico', 'pro', 'premium'].includes(tier)) {
  console.log('Uso: node deploy/gerar-chave.js <basico|pro|premium> [dias]');
  process.exit(1);
}

await connectDB();
const chave = await criarChave(tier, dias);
console.log(`\n✅ Chave ${tier} (${dias} dias):\n\n  ${chave}\n`);
process.exit(0);
