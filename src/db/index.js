import dotenv from "dotenv";
dotenv.config();

import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env");
}

const client = new Client({
  connectionString,
  // se der erro SSL em dev, descomente esta opção:
  // ssl: { rejectUnauthorized: false }
});

await client.connect();

// teste simples — consulta a hora do servidor DB
try {
  const res = await client.query("SELECT now() as now");
  console.log("Conectado ao banco");
} catch (err) {
  console.error("Erro ao conectar ao banco:", err);
}

export const db = drizzle(client);
