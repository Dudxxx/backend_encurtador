
import { LinkRepository } from "../repositories/linkRepository.js";

export async function redirectRoutes(fastify) {

  fastify.get("/:code", async (request, reply) => {
    const { code } = request.params ?? {};
    fastify.log.info("GET /:code recebido:", code);

    if (!code) {
      return reply.code(400).send({ message: "Código é obrigatório" });
    }

    try {
      const link = await LinkRepository.findByCode(code);
      if (!link) {
        return reply.code(404).send({ message: "Código não encontrado" });
      }

      try {
        await LinkRepository.incrementClicks(link.id);
      } catch (e) {
        fastify.log.warn("Falha ao incrementar clique:", e);
      }

      reply.status(302);
      reply.header("Location", link.url);
      return reply.send();
    } catch (err) {
      fastify.log.error("Erro no redirect:", err);
      return reply
        .code(500)
        .send({
          message: "Erro no redirecionamento",
          error: err.message ?? String(err),
        });
    }
  });
}
