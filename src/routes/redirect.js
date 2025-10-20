// src/routes/redirect.js
import { LinkRepository } from "../repositories/linkRepository.js";

export async function redirectRoutes(fastify) {
  // redirecionamento pelo code curto
  fastify.get("/:code", async (request, reply) => {
    const { code } = request.params;
    if (!code) return reply.code(400).send({ message: "Código é obrigatório" });

    const link = await LinkRepository.findByCode(code);
    if (!link) return reply.code(404).send({ message: "Código não encontrado" });

    // incrementa clique (não bloqueante)
    try {
      await LinkRepository.incrementClicks(link.id);
    } catch (e) {
      fastify.log.warn("Falha ao incrementar clique:", e.message || e);
      // não impede o redirecionamento
    }

    return reply.redirect(302, link.url);
  });
}
