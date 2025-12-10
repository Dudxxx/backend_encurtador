// src/routes/redirect.js
import { LinkRepository } from "../repositories/linkRepository.js";

export async function redirectRoutes(fastify) {
  fastify.get("/:code", async (request, reply) => {
    const { code } = request.params;
    
    if (!code) {
      return reply.status(400).send({ error: "Código é obrigatório" });
    }
    
    try {
      const link = await LinkRepository.findByCode(code);
      
      if (!link) {
        return reply.status(404).send({ error: "Link não encontrado" });
      }
      
      // Incrementar cliques
      await LinkRepository.incrementClicks(link.id);
      
      // Redirecionar
      return reply.redirect(302, link.url);
      
    } catch (error) {
      console.error("Erro no redirecionamento:", error);
      return reply.status(500).send({ error: "Erro interno" });
    }
  });
}