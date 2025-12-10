// src/server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawClient } from "./db/index.js";

const PORT = Number(process.env.PORT || 4000);

// Configuração SIMPLIFICADA do logger que funciona em produção
const server = Fastify({ 
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

// Configuração do CORS simplificada
await server.register(cors, {
  origin: true, // Permite todas as origens (ajuste para produção se necessário)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// Rotas
await server.register(linksRoutes, { prefix: "/api" });
await server.register(redirectRoutes);

// Health check
server.get("/health", async () => {
  try {
    await rawClient.query("SELECT 1");
    return { status: "OK", database: "connected" };
  } catch (error) {
    return { status: "ERROR", database: "disconnected", error: error.message };
  }
});

// Rota principal
server.get("/", async () => {
  return { 
    message: "API Encurtador de Links",
    version: "1.0.0",
    endpoints: {
      create: "POST /api/links",
      list: "GET /api/links",
      redirect: "GET /:code",
      health: "GET /health"
    }
  };
});

// Iniciar servidor
try {
  await server.listen({ 
    port: PORT, 
    host: "0.0.0.0" 
  });
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
} catch (error) {
  console.error("❌ Erro ao iniciar servidor:", error);
  process.exit(1);
}