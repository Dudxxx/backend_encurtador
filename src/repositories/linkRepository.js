// src/repositories/linkRepository.js
import { db } from "../db/index.js";
import { links } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const LinkRepository = {
  async create(data) {
    const [row] = await db.insert(links).values(data).returning();
    return row;
  },

  async findAll() {
    return await db.select().from(links).orderBy(links.created_at.desc);
  },

  async findById(id) {
    const [row] = await db.select().from(links).where(eq(links.id, id));
    return row ?? null;
  },

  async findByCode(code) {
    const [row] = await db.select().from(links).where(eq(links.code, code));
    return row ?? null;
  },

  async updateById(id, data) {
    const [row] = await db.update(links).set(data).where(eq(links.id, id)).returning();
    return row ?? null;
  },

  async deleteById(id) {
    await db.delete(links).where(eq(links.id, id));
  },

  async incrementClicks(id) {
    // incrementa atomically via UPDATE ... RETURNING
    const [row] = await db.update(links)
      .set({ clicks: links.clicks + 1 })
      .where(eq(links.id, id))
      .returning();
    return row;
  }
};
