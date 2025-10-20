
import { db, rawClient } from "../db/index.js";
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

  async deleteByCode(code) {

 try {
 await rawClient.query("DELETE FROM public.links WHERE code = $1", [code]);
 } catch (err) {
 console.error("Erro em deleteByCode:", err);
 throw err;
 }

 try {
 await db.delete(links).where(eq(links.code, code));
 } catch (err) {
 console.error("Erro em deleteByCode:", err);
 throw err;
 }
},

  async incrementClicks(id) {
    try {
      await rawClient.query("UPDATE public.links SET clicks = clicks + 1 WHERE id = $1", [id]);
      const res = await rawClient.query("SELECT clicks FROM public.links WHERE id = $1", [id]);
      return res.rows[0] ?? null;
    } catch (err) {
      console.error("Erro ao incrementar clicks:", err);
      throw err;
    }
  }
};