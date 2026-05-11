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
  // Optional SEO title override — when set, used instead of the auto-derived
  // "<term> — Fintech Glossary | FintechPressHub" pattern. Lets the admin
  // hand-tune high-value terms for improved SERP click-through.
  seoTitle: text("seo_title"),
  // Optional meta description override — when set, used instead of shortDef.
  // Allows custom ≤160-char SERP snippet copy per term without rewriting shortDef.
  seoDescription: text("seo_description"),
});

export type GlossaryTermRow = typeof glossaryTermsTable.$inferSelect;
