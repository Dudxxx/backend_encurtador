// src/repositories/linkRepository.js
import { db, rawPool } from "../db/index.js";
import { links } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const LinkRepository = {
  async create(data) {
    const [row] = await db.insert(links).values(data).returning();
    return row;
  },

  async findAll() {
    return await db.select().from(links).orderBy(desc(links.created_at));
  },

  async findById(id) {
    const [row] = await db.select().from(links).where(eq(links.id, id));
    return row || null;
  },

  async findByCode(code) {
    const [row] = await db.select().from(links).where(eq(links.code, code));
    return row || null;
  },

  async deleteById(id) {
    await db.delete(links).where(eq(links.id, id));
  },

  async deleteByCode(code) {
    await db.delete(links).where(eq(links.code, code));
  },

  async incrementClicks(id) {
    const client = await rawPool.connect();
    try {
      await client.query("UPDATE links SET clicks = clicks + 1 WHERE id = $1", [id]);
      const res = await client.query("SELECT clicks FROM links WHERE id = $1", [id]);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  }
};