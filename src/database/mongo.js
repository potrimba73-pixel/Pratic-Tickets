import { MongoClient } from 'mongodb';

let client, db;

export async function connectDB() {
  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db('pratic');
  console.log('✅ MongoDB ligado');
  return db;
}

export function getDB() {
  if (!db) throw new Error('DB não inicializada');
  return db;
}
