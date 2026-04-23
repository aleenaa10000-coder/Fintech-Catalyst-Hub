import { pgTable, serial, text, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const pricingPlansTable = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  priceUnit: text("price_unit").notNull().default("USD/month"),
  description: text("description").notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  ctaLabel: text("cta_label").notNull().default("Get started"),
  highlighted: boolean("highlighted").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});
