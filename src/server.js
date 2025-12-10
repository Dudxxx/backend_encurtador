// src/server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawClient } from "./db/index.js";

const PORT = Number(process.env.PORT || 4000);

const ORIGIN_RAW = process.env.CORS_ORIGIN ?? "";
const ORIGIN_TRIM = ORIGIN_RAW.trim();

// Crie o server antes de usar server.log
const server = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      }
    }
  }
});

// Configuração do CORS
server.log.info("CORS_ORIGIN env:", ORIGIN_TRIM);
if (ORIGIN_TRIM === "*" || ORIGIN_TRIM === "") {
  server.log.warn("CORS: modo permissivo ativo (ORIGIN='*' ou vazio).");
  await server.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
    credentials: false,
  });
} else {
  const allowed = ORIGIN_TRIM.split(",").map((s) => s.trim()).filter(Boolean);
  server.log.info("CORS: origens permitidas:", allowed);

  await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
    credentials: true,
  });
}

// Hook para log de todas as requisições
server.addHook("onRequest", async (request, reply) => {
  server.log.info(`[REQ] ${request.method} ${request.url} Origin=${request.headers.origin ?? "-"}`);
});

// Registrar rotas
await server.register(linksRoutes, { prefix: "/api" });
await server.register(redirectRoutes);

// Health check endpoint
server.get("/health", async () => {
  try {
    const res = await rawClient.query("SELECT 1 as ok");
    return { 
      ok: true, 
      message: "API está funcionando",
      database: "conectado"
    };
  } catch (err) {
    return { 
      ok: false, 
      error: err.message,
      database: "desconectado"
    };
  }
});

// Endpoint de debug para verificar URLs no banco
server.get("/api/debug/urls", async (request, reply) => {
  try {
    const result = await rawClient.query(`
      SELECT id, code, url, clicks, created_at 
      FROM links 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    return reply.code(200).send(result.rows);
  } catch (err) {
    return reply.code(500).send({ error: err.message });
  }
});

// Iniciar servidor
try {
  await server.listen({ port: PORT, host: "0.0.0.0" });
  server.log.info(`✅ Servidor rodando em http://0.0.0.0:${PORT}`);
  server.log.info(`✅ Health check disponível em http://0.0.0.0:${PORT}/health`);
  server.log.info(`✅ API disponível em http://0.0.0.0:${PORT}/api/links`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}