import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const glossaryTermsTable = pgTable("glossary_terms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  term: text("term").notNull(),
  shortDef: text("short_def").notNull(),
  body: text("body").notNull(),
  category: text("category"),
  relatedTerms: jsonb("related_terms").$type<string[]>().notNull().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type GlossaryTermRow = typeof glossaryTermsTable.$inferSelect;
