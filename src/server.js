// src/server.js
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawClient } from "./db/index.js"; // garante carregamento e conexão

const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CORS_ORIGIN || "*";

const server = Fastify({ logger: true });

// CORS
await server.register(cors, {
  origin: ORIGIN
});

// rotas API (prefixo /api)
await server.register(linksRoutes, { prefix: "/api" });

// rota de redirect (code sem prefixo)
await server.register(redirectRoutes);

// health endpoint simples
server.get("/health", async (req, reply) => {
  try {
    const res = await rawClient.query("SELECT 1 as ok");
    return reply.send({ ok: true });
  } catch (err) {
    return reply.code(500).send({ ok: false, error: err.message });
  }
});

server.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  server.log.info(`Server listening on http://0.0.0.0:${PORT}`);
});
