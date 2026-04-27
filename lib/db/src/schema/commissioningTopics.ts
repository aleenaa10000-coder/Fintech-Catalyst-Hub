import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const commissioningTopicsTable = pgTable("commissioning_topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  angle: text("angle").notNull().default(""),
  category: text("category").notNull().default(""),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
