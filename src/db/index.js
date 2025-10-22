// src/db/index.js
import dotenv from "dotenv";
dotenv.config();

import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env");
}

function addNeonEndpointOption(connStr) {
  try {
    const url = new URL(connStr);
    const host = url.hostname; // ex: ep-shy-bush-ah3ds9ze-pooler.c-3.us-east-1.aws.neon.tech
    const firstPart = host.split(".")[0]; // **use exatamente este valor**
    if (host.includes("neon.tech")) {
      const params = url.searchParams;
      // se já existe options e bate com firstPart, retorna original
      if (params.has("options")) {
        const val = params.get("options") || "";
        // se já contém endpoint=firstPart, ok
        if (val.includes(`endpoint=${firstPart}`)) return connStr;
        // caso exista options diferente — substitui pela correta
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
console.log("Using connection string host:", (() => { try { return new URL(adjustedConnectionString).hostname } catch { return adjustedConnectionString } })());

const client = new Client({
  connectionString: adjustedConnectionString,
  ssl: { rejectUnauthorized: false }, // ok para dev
});

await client.connect();

try {
  const res = await client.query("SELECT now() as now");
  console.log("Conectado ao banco. Hora DB:", res.rows[0].now);
} catch (err) {
  console.error("Erro ao conectar ao banco:", err);
  throw err;
}

export const rawClient = client;
export const db = drizzle(client);
