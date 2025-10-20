// src/server.js (troque a parte de cors/registro por isto)
import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawClient } from "./db/index.js";

const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CORS_ORIGIN || "*";

const server = Fastify({ logger: true });

// DEV: permitir todas origens (se você preferir usar apenas a origem, coloque ORIGIN)
await server.register(cors, {
  origin: true,        // permite qualquer origem — seguro só em dev
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"]
});

// Log simples de todas as requisições (útil para debug)
server.addHook("onRequest", async (request, reply) => {
  // imprime método, url, origin e body length (body aparece no onResponse/handler)
  server.log.info(`[REQ] ${request.method} ${request.url}  Origin=${request.headers.origin ?? "-"}`);
});

// registrar rotas API e redirect
await server.register(linksRoutes, { prefix: "/api" });
await server.register(redirectRoutes);

// health
server.get("/health", async () => {
  try {
    const res = await rawClient.query("SELECT 1 as ok");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

server.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  server.log.info(`Server listening on http://0.0.0.0:${PORT}`);
});
