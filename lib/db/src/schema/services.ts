import { pgTable, serial, text, jsonb } from "drizzle-orm/pg-core";

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  deliverables: jsonb("deliverables").$type<string[]>().notNull().default([]),
  icon: text("icon").notNull(),
});
