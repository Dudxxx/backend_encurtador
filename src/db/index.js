// index.js
// Requer: "type": "module" no package.json
import dotenv from "dotenv";
dotenv.config();

import dns from "dns/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in environment variables");
}

// Detecta quando for necessário usar SSL (Supabase costuma exigir)
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
      // Supabase/PG em cloud normalmente exige SSL; rejectUnauthorized false para evitar erro com certs auto-assinados
      clientConfig.ssl = { rejectUnauthorized: false };
    }

    return new Client(clientConfig);
  } catch (err) {
    console.warn(
      "⚠️  Não foi possível resolver IPv4 automaticamente (ou outro erro ao tentar usar IPv4):",
      err && err.message ? err.message : err
    );
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
  // Tenta primeiro resolver IPv4 para evitar problemas de DNS/IPv6 em algumas infra
  try {
    client = await createClientUsingIPv4();
  } catch (err) {
    // Se falhar a resolução/uso de IPv4, faz fallback para usar diretamente a connection string
    client = await createClientFallbackToConnectionString();
  }

  // Conecta
  await client.connect();

  // Testa uma query simples para confirmar conexão
  try {
    const res = await client.query("SELECT now() as now");
    console.log("✅ Conectado ao banco. Hora do DB:", res.rows && res.rows[0] ? res.rows[0].now : res);
  } catch (err) {
    console.error("❌ Erro ao testar query no DB:", err && err.message ? err.message : err);
  }
} catch (err) {
  console.error("❌ Falha ao conectar ao banco de dados:", err && err.message ? err.message : err);
  // Lança o erro pra subir a falha durante o start (útil para a infra detectar e reiniciar/erro no deploy)
  throw err;
}

// Exports
export const rawClient = client;
export const db = drizzle(client);
