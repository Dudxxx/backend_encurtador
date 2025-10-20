// src/db/index.js
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
    // tenta resolver IPv4 explicitamente
    const lookupRes = await dns.lookup(host, { family: 4 });
    const ipv4 = lookupRes.address;
    console.log("✅ Resolved IPv4:", ipv4);

    // monta config do client usando o IPv4
    const clientConfig = {
      host: ipv4,
      port,
      user,
      password,
      database
    };

    if (useSsl) {
      // em dev com Supabase pode ser necessário desabilitar rejectUnauthorized
      clientConfig.ssl = { rejectUnauthorized: false };
    }

    return new Client(clientConfig);
  } catch (err) {
    console.warn("⚠️  Não foi possível resolver IPv4 automaticamente:", err.message || err);
    // lança o erro pra que o chamador saiba e faça fallback se desejar
    throw err;
  }
}

async function createClientFallbackToConnectionString() {
  // fallback: usa connectionString direta (pode usar IPv6 ou resolver normalmente)
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
  // primeiro tentamos criar client forçando IPv4 resolution
  try {
    client = await createClientUsingIPv4();
  } catch (err) {
    // se falhar a resolução IPv4, tentamos o fallback
    client = await createClientFallbackToConnectionString();
  }

  await client.connect();

  // Verifica conexão com uma query simples
  try {
    const res = await client.query("SELECT now() as now");
    console.log("✅ Conectado ao banco. Hora do DB:", res.rows[0].now);
  } catch (err) {
    console.error("❌ Erro ao testar query no DB:", err.message || err);
  }
} catch (err) {
  console.error("❌ Falha ao conectar ao banco de dados:", err.message || err);
  // relança para que a aplicação encerre se preferir (opcional)
  throw err;
}

export const rawClient = client;
export const db = drizzle(client);
