import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  quote: text("quote").notNull(),
  rating: integer("rating").notNull().default(5),
});
