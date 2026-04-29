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
  // Inbox triage state — see contactSubmissions.ts for the same pattern.
  // "unread" is the default for new pitches; editors flip to "handled"
  // after replying or rejecting. Dashboard "Guest Pitches" tile only
  // counts the unread bucket so it acts as a real to-do indicator.
  status: text("status").notNull().default("unread"),
  handledAt: timestamp("handled_at", { withTimezone: true }),
  handledBy: text("handled_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
