// src/server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawPool } from "./db/index.js";

const PORT = Number(process.env.PORT || 4000);

// Configuração simples do Fastify
const server = Fastify({
  logger: false // Desativa logger para evitar problemas
});

// Configuração do CORS
await server.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// Registrar rotas
await server.register(linksRoutes, { prefix: "/api" });
await server.register(redirectRoutes);

// Health check simplificado
server.get("/health", async (request, reply) => {
  try {
    const client = await rawPool.connect();
    client.release();
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected"
    };
  } catch (error) {
    console.error("Health check failed:", error.message);
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error.message
    };
  }
});

// Rota raiz
server.get("/", async () => {
  return {
    message: "Encurtador de Links API",
    version: "1.0.0",
    endpoints: {
      create: "POST /api/links",
      list: "GET /api/links",
      redirect: "GET /:code",
      health: "GET /health"
    }
  };
});

// Error handler
server.setErrorHandler((error, request, reply) => {
  console.error("Error:", error);
  reply.status(500).send({
    error: "Internal server error"
  });
});

// Iniciar servidor
const start = async () => {
  try {
    // Tentar conectar ao banco
    try {
      const client = await rawPool.connect();
      console.log("✅ Conectado ao banco de dados");
      client.release();
    } catch (error) {
      console.warn("⚠️  Não foi possível conectar ao banco, mas o servidor continuará");
    }
    
    // Iniciar servidor
    await server.listen({
      port: PORT,
      host: "0.0.0.0"
    });
    
    console.log(`🚀 Servidor iniciado na porta ${PORT}`);
    console.log(`🌍 Health check: http://localhost:${PORT}/health`);
    
  } catch (error) {
    console.error("❌ Falha ao iniciar servidor:", error);
    process.exit(1);
  }
};

// Capturar sinais de desligamento
process.on('SIGTERM', async () => {
  console.log('🛑 Encerrando servidor...');
  await server.close();
  await rawPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  await server.close();
  await rawPool.end();
  process.exit(0);
});

start();