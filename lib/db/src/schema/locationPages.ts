import { doublePrecision, index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  // Optional per-page SEO overrides — when set, these win over the auto-derived
  // title (from headline) and description. Lets the admin hand-tune how each
  // location page appears in Google SERPs without editing the headline.
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
}, (table) => ({
  countryIdx: index("location_pages_country_idx").on(table.country),
  cityIdx: index("location_pages_city_idx").on(table.city),
}));

export type LocationPageRow = typeof locationPagesTable.$inferSelect;
