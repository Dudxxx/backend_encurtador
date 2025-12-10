// src/repositories/linkRepository.js
import { db, rawPool } from "../db/index.js";
import { links } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

export const LinkRepository = {
  async create(data) {
    try {
      const [row] = await db.insert(links).values(data).returning();
      return row;
    } catch (error) {
      console.error('Erro ao criar link:', error);
      throw error;
    }
  },

  async findAll() {
    try {
      return await db.select().from(links).orderBy(desc(links.created_at));
    } catch (error) {
      console.error('Erro ao buscar todos os links:', error);
      throw error;
    }
  },

  async findById(id) {
    try {
      const [row] = await db.select().from(links).where(eq(links.id, id));
      return row ?? null;
    } catch (error) {
      console.error('Erro ao buscar link por ID:', error);
      throw error;
    }
  },

  async findByCode(code) {
    try {
      const [row] = await db.select().from(links).where(eq(links.code, code));
      return row ?? null;
    } catch (error) {
      console.error('Erro ao buscar link por código:', error);
      throw error;
    }
  },

  async updateById(id, data) {
    try {
      const [row] = await db.update(links).set(data).where(eq(links.id, id)).returning();
      return row ?? null;
    } catch (error) {
      console.error('Erro ao atualizar link:', error);
      throw error;
    }
  },

  async deleteById(id) {
    try {
      await db.delete(links).where(eq(links.id, id));
    } catch (error) {
      console.error('Erro ao deletar link por ID:', error);
      throw error;
    }
  },

  async deleteByCode(code) {
    try {
      await db.delete(links).where(eq(links.code, code));
    } catch (error) {
      console.error('Erro ao deletar link por código:', error);
      throw error;
    }
  },

  async incrementClicks(id) {
    try {
      const client = await rawPool.connect();
      try {
        await client.query("UPDATE links SET clicks = clicks + 1 WHERE id = $1", [id]);
        const res = await client.query("SELECT clicks FROM links WHERE id = $1", [id]);
        return res.rows[0] ?? null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao incrementar cliques:', error);
      throw error;
    }
  }
};