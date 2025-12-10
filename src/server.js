// src/server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawPool, testConnection } from "./db/index.js";

const PORT = Number(process.env.PORT || 4000);

// Configuração do Fastify sem logger em produção
const server = Fastify({
  logger: process.env.NODE_ENV !== 'production'
});

// Configuração do CORS
await server.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// Middleware de log
server.addHook('onRequest', (request, reply, done) => {
  console.log(`${new Date().toISOString()} ${request.method} ${request.url}`);
  done();
});

// Registrar rotas
await server.register(linksRoutes, { prefix: "/api" });
await server.register(redirectRoutes);

// Health check resiliente
server.get("/health", async (request, reply) => {
  try {
    const client = await rawPool.connect();
    try {
      await client.query("SELECT 1");
      
      // Verificar status do pool
      const poolStats = {
        totalCount: rawPool.totalCount,
        idleCount: rawPool.idleCount,
        waitingCount: rawPool.waitingCount
      };
      
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        pool: poolStats,
        uptime: process.uptime()
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Health check failed:", error.message);
    
    // Tentar reconectar
    const reconnected = await testConnection();
    
    return {
      status: reconnected ? "recovered" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: reconnected ? "reconnected" : "disconnected",
      error: error.message,
      uptime: process.uptime()
    };
  }
});

// Rota raiz
server.get("/", async () => {
  return {
    message: "Encurtador de Links API",
    version: "1.0.0",
    status: "operational",
    endpoints: {
      create: "POST /api/links",
      list: "GET /api/links",
      redirect: "GET /:code",
      health: "GET /health"
    }
  };
});

// Error handler global
server.setErrorHandler((error, request, reply) => {
  console.error("Global error handler:", error);
  
  // Se for erro de banco, tentar reconectar
  if (error.code === 'ECONNREFUSED' || error.message.includes('connection')) {
    console.log("Tentando reconectar ao banco...");
    testConnection().catch(console.error);
  }
  
  reply.status(error.statusCode || 500).send({
    error: process.env.NODE_ENV === 'production' 
      ? "Internal server error" 
      : error.message,
    statusCode: error.statusCode || 500
  });
});

// Iniciar servidor
const start = async () => {
  try {
    // Tentar conectar ao banco (mas não falhar se não conseguir)
    console.log("🔄 Iniciando servidor...");
    
    // Testar conexão em background
    setTimeout(async () => {
      try {
        await testConnection();
      } catch (error) {
        console.warn("⚠️  Conexão com banco falhou inicialmente, mas servidor continuará");
      }
    }, 1000);
    
    // Iniciar servidor mesmo sem conexão com banco
    await server.listen({
      port: PORT,
      host: "0.0.0.0"
    });
    
    console.log(`✅ Servidor iniciado na porta ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    
  } catch (error) {
    console.error("❌ Falha crítica ao iniciar servidor:", error);
    process.exit(1);
  }
};

// Capturar sinais de desligamento
process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  await server.close();
  await rawPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  await server.close();
  await rawPool.end();
  process.exit(0);
});

// Iniciar
start();