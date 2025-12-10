// src/server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawClient } from "./db/index.js";

const PORT = Number(process.env.PORT || 4000);

// Configuração simplificada do Fastify
const server = Fastify({ 
  logger: process.env.NODE_ENV !== 'production'
});

// Configuração do CORS
await server.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// Log de todas as requisições
server.addHook('onRequest', (request, reply, done) => {
  console.log(`${request.method} ${request.url}`);
  done();
});

// Registrar rotas
await server.register(linksRoutes, { prefix: "/api" });
await server.register(redirectRoutes);

// Health check
server.get("/health", async () => {
  try {
    await rawClient.query("SELECT 1");
    return { 
      status: "OK", 
      database: "connected",
      timestamp: new Date().toISOString() 
    };
  } catch (error) {
    console.error("Database connection error:", error);
    return { 
      status: "ERROR", 
      database: "disconnected",
      error: error.message 
    };
  }
});

// Rota para listar todas as URLs (debug)
server.get("/api/debug/urls", async () => {
  try {
    const result = await rawClient.query(`
      SELECT id, code, url, clicks, created_at 
      FROM links 
      ORDER BY created_at DESC
    `);
    return result.rows;
  } catch (error) {
    return { error: error.message };
  }
});

// Iniciar servidor
const start = async () => {
  try {
    await server.listen({ 
      port: PORT, 
      host: "0.0.0.0" 
    });
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Debug URLs: http://localhost:${PORT}/api/debug/urls`);
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
};

start();