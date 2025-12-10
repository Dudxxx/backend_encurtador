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
server.log.info("CORS_ORIGIN env:", ORIGIN_TRIM);

const server = Fastify({ logger: true });

if (ORIGIN_TRIM === "*" || ORIGIN_TRIM === "") {

  server.log.warn("CORS: modo permissivo ativo (ORIGIN='*' ou vazio). Não recomendado em produção.");
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

server.addHook("onRequest", async (request, reply) => {
  server.log.info(`[REQ] ${request.method} ${request.url}  Origin=${request.headers.origin ?? "-"}`);
});

await server.register(linksRoutes, { prefix: "/api" });
await server.register(redirectRoutes);

server.get("/health", async () => {
  try {
    const res = await rawClient.query("SELECT 1 as ok");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

await server.listen({ port: PORT, host: "0.0.0.0" });
server.log.info(`Server listening on http://0.0.0.0:${PORT}`);
