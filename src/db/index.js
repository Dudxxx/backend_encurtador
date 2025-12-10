// src/db/index.js
import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env");
}

function addNeonEndpointOption(connStr) {
  try {
    const url = new URL(connStr);
    const host = url.hostname;
    const firstPart = host.split(".")[0];
    if (host.includes("neon.tech")) {
      const params = url.searchParams;
      if (params.has("options")) {
        const val = params.get("options") || "";
        if (val.includes(`endpoint=${firstPart}`)) return connStr;
        params.set("options", `endpoint=${firstPart}`);
        url.search = params.toString();
        return url.toString();
      } else {
        params.append("options", `endpoint=${firstPart}`);
        url.search = params.toString();
        return url.toString();
      }
    }
    return connStr;
  } catch (err) {
    return connStr;
  }
}

const adjustedConnectionString = addNeonEndpointOption(connectionString);

const pool = new Pool({
  connectionString: adjustedConnectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ Nova conexão estabelecida com o banco');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool do PostgreSQL:', err);
});

// Função para testar a conexão (EXPORTADA)
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('🔄 Testando conexão com o banco...');
    const res = await client.query('SELECT NOW() as now');
    client.release();
    console.log('✅ Conexão com banco OK. Hora do DB:', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    return false;
  }
}

export const db = drizzle(pool);
export const rawPool = pool;

// Função para obter uma conexão quando necessário
export async function getConnection() {
  const client = await pool.connect();
  return {
    client,
    release: () => client.release(),
    query: (text, params) => client.query(text, params)
  };
}