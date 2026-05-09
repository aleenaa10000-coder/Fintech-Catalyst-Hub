import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const locationPagesTable = pgTable("location_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  city: text("city").notNull(),
  region: text("region"),
  country: text("country").notNull(),
  countryCode: text("country_code").notNull(),
  headline: text("headline").notNull(),
  body: text("body").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LocationPageRow = typeof locationPagesTable.$inferSelect;
