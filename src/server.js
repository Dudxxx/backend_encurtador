import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
dotenv.config();

import { linksRoutes } from "./routes/links.js";
import { redirectRoutes } from "./routes/redirect.js";
import { rawClient } from "./db/index.js";

const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CORS_ORIGIN || "*"; // agora usamos a env aqui

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: ORIGIN,         // <-- use a variável ORIGIN
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  credentials: true
});

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

// usar await aqui fica coerente já que o arquivo é módulo (top-level await)
await server.listen({ port: PORT, host: "0.0.0.0" });
server.log.info(`Server listening on http://0.0.0.0:${PORT}`);
