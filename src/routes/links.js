// src/routes/links.js
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { LinkRepository } from "../repositories/linkRepository.js";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

export async function linksRoutes(fastify) {
  // Criar link
  fastify.post("/links", async (request, reply) => {
    try {
      const { url, legenda, title } = request.body || {};
      
      if (!url) {
        return reply.status(400).send({ error: "URL é obrigatória" });
      }
      
      let finalUrl = url.trim();
      
      // Adicionar protocolo se não tiver
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = "https://" + finalUrl;
      }
      
      // Validar URL
      try {
        new URL(finalUrl);
      } catch (err) {
        return reply.status(400).send({ 
          error: "URL inválida",
          suggestion: "Use um formato válido como: https://exemplo.com"
        });
      }
      
      // Gerar código único
      let code;
      let attempts = 0;
      
      do {
        code = nanoid();
        attempts++;
        if (attempts > 10) {
          return reply.status(500).send({ error: "Erro ao gerar código" });
        }
      } while (await LinkRepository.findByCode(code));
      
      // Salvar no banco
      const link = await LinkRepository.create({
        url: finalUrl,
        legenda: legenda || title || "Sem legenda",
        code,
        clicks: 0
      });
      
      return reply.status(201).send({
        success: true,
        data: link,
        shortUrl: `${process.env.BASE_URL || `https://${request.headers.host}`}/${code}`
      });
      
    } catch (error) {
      console.error("Erro ao criar link:", error);
      return reply.status(500).send({
        success: false,
        error: "Erro ao criar link"
      });
    }
  });

  // Listar links
  fastify.get("/links", async (request, reply) => {
    try {
      const links = await LinkRepository.findAll();
      return reply.send({
        success: true,
        data: links,
        count: links.length
      });
    } catch (error) {
      console.error("Erro ao listar links:", error);
      return reply.status(500).send({
        success: false,
        error: "Erro ao listar links"
      });
    }
  });

  // Deletar link
  fastify.delete("/links/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      
      if (!id) {
        return reply.status(400).send({ error: "ID é obrigatório" });
      }
      
      await LinkRepository.deleteById(parseInt(id, 10) || id);
      
      return reply.status(204).send();
      
    } catch (error) {
      console.error("Erro ao deletar link:", error);
      return reply.status(500).send({
        success: false,
        error: "Erro ao deletar link"
      });
    }
  });
}