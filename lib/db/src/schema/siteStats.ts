import { pgTable, serial, integer } from "drizzle-orm/pg-core";

export const siteStatsTable = pgTable("site_stats", {
  id: serial("id").primaryKey(),
  clientsServed: integer("clients_served").notNull().default(0),
  articlesPublished: integer("articles_published").notNull().default(0),
  backlinksAcquired: integer("backlinks_acquired").notNull().default(0),
  averageDomainRating: integer("average_domain_rating").notNull().default(0),
});
