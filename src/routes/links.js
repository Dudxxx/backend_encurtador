// src/routes/links.js
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { LinkRepository } from "../repositories/linkRepository.js";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

export async function linksRoutes(fastify) {
  // CREATE
  fastify.post("/links", async (request, reply) => {
    const bodySchema = z.object({
      legenda: z.string().optional(),
      title: z.string().optional(),
      url: z.string().url()
    });

    const parsed = bodySchema.parse(request.body || {});
    const legenda = parsed.legenda ?? parsed.title ?? "Sem legenda";
    const url = parsed.url;

    // Gera code único
    let code = nanoid();
    let tries = 0;
    while (await LinkRepository.findByCode(code)) {
      code = nanoid();
      tries++;
      if (tries > 50) return reply.internalServerError("Não foi possível gerar código único");
    }

    const created = await LinkRepository.create({
      legenda,
      url,
      code,
      clicks: 0
    });

    return reply.code(201).send(created);
  });

  // READ ALL
  fastify.get("/links", async (request, reply) => {
    const all = await LinkRepository.findAll();
    return reply.send(all);
  });

  // UPDATE
  fastify.put("/links/:id", async (request, reply) => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const bodySchema = z.object({
      legenda: z.string().optional(),
      url: z.string().url().optional()
    });

    const { id } = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const updated = await LinkRepository.updateById(id, body);
    if (!updated) return reply.code(404).send({ message: "Link não encontrado" });
    return reply.send(updated);
  });

  // DELETE
  fastify.delete("/links/:id", async (request, reply) => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const { id } = paramsSchema.parse(request.params);

    const exists = await LinkRepository.findById(id);
    if (!exists) return reply.code(404).send({ message: "Link não encontrado" });

    await LinkRepository.deleteById(id);
    return reply.code(204).send();
  });
}
