// src/db/schema.js
import { pgTable, serial, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const links = pgTable("links", {
  id: serial("id").primaryKey(),
  legenda: text("legenda").notNull(),
  url: text("url").notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  clicks: integer("clicks").default(0).notNull(),
  created_at: timestamp("created_at", { mode: "utc" }).defaultNow().notNull()
});