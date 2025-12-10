// src/routes/links.js
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { LinkRepository } from "../repositories/linkRepository.js";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

export async function linksRoutes(fastify) {

  fastify.post("/links", async (request, reply) => {
    fastify.log.info("POST /api/links recebido, origin:", request.headers.origin);

    // VALIDAÇÃO E CORREÇÃO DA URL (CORREÇÃO PRINCIPAL)
    if (request.body && typeof request.body.url === "string") {
      let url = request.body.url.trim();
      
      // Remove espaços em branco
      url = url.trim();
      
      // Verifica se já tem protocolo
      if (!/^\s*https?:\/\//i.test(url)) {
        // Para URLs locais em desenvolvimento, use http
        if (url.includes('localhost') || 
            url.includes('127.0.0.1') || 
            url.startsWith('0.0.0.0') ||
            url.startsWith('0.0.0.1') ||
            /^\d+\.\d+\.\d+\.\d+/.test(url)) {
          url = "http://" + url;
        } else {
          // Para URLs públicas, use https
          url = "https://" + url;
        }
      }
      
      // Valida se é uma URL válida
      try {
        new URL(url);
        request.body.url = url;
      } catch (err) {
        fastify.log.warn("URL inválida após correção:", url);
        return reply.code(400).send({ 
          message: "URL inválida. Use um formato correto como: https://exemplo.com ou http://localhost:3000",
          url_recebida: request.body.url,
          url_corrigida: url
        });
      }
    }

    const bodySchema = z.object({
      legenda: z.string().optional(),
      title: z.string().optional(),
      url: z.string().url()
    });

    let parsed;
    try {
      parsed = bodySchema.parse(request.body || {});
    } catch (err) {
      fastify.log.warn("Payload inválido:", err.errors ?? err.message ?? err);
      return reply.code(400).send({ 
        message: "Payload inválido", 
        details: err.errors ?? err.message,
        body_recebido: request.body
      });
    }

    const legenda = parsed.legenda ?? parsed.title ?? "Sem legenda";
    const url = parsed.url;

    try {
      // Log da URL que será salva
      fastify.log.info("URL que será salva no banco:", url);

      let code = nanoid();
      let tries = 0;
      while (await LinkRepository.findByCode(code)) {
        code = nanoid();
        tries++;
        if (tries > 50) {
          fastify.log.error("Não foi possível gerar código único após 50 tentativas");
          return reply.code(500).send({ message: "Erro interno ao gerar código" });
        }
      }

      const created = await LinkRepository.create({
        legenda,
        url,
        code,
        clicks: 0
      });

      return reply.code(201).send(created);
    } catch (err) {
      fastify.log.error("Erro ao criar link:", err);
      return reply.code(500).send({ 
        message: "Erro ao salvar link", 
        error: err.message ?? String(err) 
      });
    }
  });

  fastify.get("/links", async (request, reply) => {
    try {
      const all = await LinkRepository.findAll();
      return reply.code(200).send(all);
    } catch (err) {
      fastify.log.error("Erro ao listar links:", err);
      return reply.code(500).send({ 
        message: "Erro ao listar links", 
        error: err.message ?? String(err) 
      });
    }
  });

  fastify.put("/links/:id", async (request, reply) => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const bodySchema = z.object({
      legenda: z.string().optional(),
      url: z.string().url().optional()
    });

    let id;
    try {
      ({ id } = paramsSchema.parse(request.params));
    } catch (err) {
      return reply.code(400).send({ message: "ID inválido" });
    }

    let body;
    try {
      body = bodySchema.parse(request.body);
    } catch (err) {
      return reply.code(400).send({ 
        message: "Payload inválido", 
        details: err.errors ?? err.message 
      });
    }

    try {
      const updated = await LinkRepository.updateById(id, body);
      if (!updated) return reply.code(404).send({ message: "Link não encontrado" });
      return reply.code(200).send(updated);
    } catch (err) {
      fastify.log.error("Erro ao atualizar link:", err);
      return reply.code(500).send({ 
        message: "Erro ao atualizar", 
        error: err.message ?? String(err) 
      });
    }
  });

  fastify.delete("/links/:id", async (request, reply) => {
    try {
      fastify.log.info("DEBUG DELETE request received");
      fastify.log.info("  params:", request.params);
      fastify.log.info("  headers.origin:", request.headers.origin);
      fastify.log.info("  raw body:", request.body);

      const rawId = String(request.params?.id ?? "");
      fastify.log.info("  rawId:", rawId);

      const asNumber = Number(rawId);
      const isNumberId = Number.isInteger(asNumber) && String(asNumber) === rawId;

      if (isNumberId) {
        fastify.log.info("  Deleting by numeric id:", asNumber);
        const exists = await LinkRepository.findById(asNumber);
        if (!exists) {
          fastify.log.warn("  Not found by id:", asNumber);
          return reply.code(404).send({ message: "Link não encontrado (id)" });
        }
        await LinkRepository.deleteById(asNumber);
        fastify.log.info("  Deleted by id:", asNumber);
        return reply.code(204).send();
      } else {
        fastify.log.info("  Deleting by code:", rawId);
        const exists = await LinkRepository.findByCode(rawId);
        if (!exists) {
          fastify.log.warn("  Not found by code:", rawId);
          return reply.code(404).send({ message: "Link não encontrado (code)" });
        }
        await LinkRepository.deleteByCode(rawId);
        fastify.log.info("  Deleted by code:", rawId);
        return reply.code(204).send();
      }
    } catch (err) {
      fastify.log.error("DEBUG delete error:", err);
      return reply.code(500).send({ 
        message: "Erro ao deletar (debug)", 
        error: err.message ?? String(err) 
      });
    }
  });
}