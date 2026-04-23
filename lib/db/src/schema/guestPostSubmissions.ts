import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const guestPostSubmissionsTable = pgTable("guest_post_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  topic: text("topic").notNull(),
  category: text("category"),
  pitch: text("pitch").notNull(),
  sampleUrl: text("sample_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
