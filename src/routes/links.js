// src/routes/links.js
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { LinkRepository } from "../repositories/linkRepository.js";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

export async function linksRoutes(fastify) {

  fastify.post("/links", async (request, reply) => {
  try {
    // Log do que foi recebido
    console.log("Body recebido:", request.body);
    
    // VALIDAÇÃO FORTE DA URL
    if (!request.body || typeof request.body.url !== 'string') {
      return reply.code(400).send({ 
        error: "URL é obrigatória e deve ser uma string" 
      });
    }
    
    let url = request.body.url.trim();
    
    // Verificar se é uma URL inválida conhecida
    const invalidPatterns = [
      /^0\.0\.0\.\d+/,        // 0.0.0.1, 0.0.0.2, etc
      /^localhost(\:\d+)?$/,   // localhost:3000
      /^127\.0\.0\.1(\:\d+)?$/, // 127.0.0.1:3000
      /^\d+\.\d+\.\d+\.\d+$/,  // Qualquer IP sem protocolo
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(url)) {
        return reply.code(400).send({
          error: `URL inválida: "${url}". Use uma URL pública válida como "https://exemplo.com"`,
          suggestion: "Se estiver testando localmente, use http://localhost:3000 (com http://)"
        });
      }
    }
    
    // Adicionar protocolo se não tiver
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    
    // Validar formato da URL
    try {
      new URL(url);
    } catch (err) {
      return reply.code(400).send({
        error: "URL inválida",
        details: "Formato incorreto. Exemplos válidos:",
        examples: [
          "https://google.com",
          "http://localhost:3000",
          "https://meusite.vercel.app"
        ]
      });
    }
    
    // Verificar se é um domínio real (não localhost em produção)
    const urlObj = new URL(url);
    if (process.env.NODE_ENV === 'production') {
      const localDomains = ['localhost', '127.0.0.1', '0.0.0.0', '0.0.0.1', '0.0.0.2'];
      if (localDomains.includes(urlObj.hostname)) {
        return reply.code(400).send({
          error: "URL local não permitida em produção",
          suggestion: "Use um domínio público"
        });
      }
    }
    
    // Resto do código para criar o link...
    let code = nanoid();
    let tries = 0;
    
    while (await LinkRepository.findByCode(code)) {
      code = nanoid();
      tries++;
      if (tries > 50) {
        return reply.code(500).send({ error: "Erro ao gerar código único" });
      }
    }
    
    const legenda = request.body.legenda || request.body.title || "Sem legenda";
    
    const created = await LinkRepository.create({
      legenda,
      url,
      code,
      clicks: 0
    });
    
    // Retornar URL completa do link encurtado
    const baseUrl = process.env.BASE_URL || `http://${request.headers.host}`;
    
    return reply.code(201).send({
      ...created,
      shortUrl: `${baseUrl}/${code}`
    });
    
  } catch (error) {
    console.error("Erro ao criar link:", error);
    return reply.code(500).send({ 
      error: "Erro interno do servidor" 
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