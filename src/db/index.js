
import dotenv from "dotenv";
dotenv.config();

import dns from "dns/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env");
}

const useSsl =
  (process.env.DB_SSL || "").toLowerCase() === "true" ||
  connectionString.includes("supabase.co");

async function createClientUsingIPv4() {
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    const port = Number(url.port || 5432);
    const user = decodeURIComponent(url.username || "");
    const password = decodeURIComponent(url.password || "");
    const database = url.pathname ? url.pathname.replace(/^\//, "") : "postgres";

    console.log("🔎 Resolving IPv4 for host:", host);

    const lookupRes = await dns.lookup(host, { family: 4 });
    const ipv4 = lookupRes.address;
    console.log("✅ Resolved IPv4:", ipv4);


    const clientConfig = {
      host: ipv4,
      port,
      user,
      password,
      database
    };

    if (useSsl) {

      clientConfig.ssl = { rejectUnauthorized: false };
    }

    return new Client(clientConfig);
  } catch (err) {
    console.warn("⚠️  Não foi possível resolver IPv4 automaticamente:", err.message || err);

    throw err;
  }
}

async function createClientFallbackToConnectionString() {

  console.log("🔁 Usando fallback: conexão pela connectionString direta");
  const clientConfig = {
    connectionString
  };
  if (useSsl) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }
  return new Client(clientConfig);
}

let client;
try {

  try {
    client = await createClientUsingIPv4();
  } catch (err) {

    client = await createClientFallbackToConnectionString();
  }

  await client.connect();


  try {
    const res = await client.query("SELECT now() as now");
    console.log(" Conectado ao banco. Hora do DB:", res.rows[0].now);
  } catch (err) {
    console.error(" Erro ao testar query no DB:", err.message || err);
  }
} catch (err) {
  console.error(" Falha ao conectar ao banco de dados:", err.message || err);

  throw err;
}

export const rawClient = client;
export const db = drizzle(client);
