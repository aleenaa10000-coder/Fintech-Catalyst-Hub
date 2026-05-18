import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const contactSubmissionsTable = pgTable(
  "contact_submissions",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    phone: text("phone"),
    website: text("website"),
    service: text("service"),
    budget: text("budget"),
    message: text("message").notNull(),
    // Inbox triage state. Defaults to "unread" so every fresh form submission
    // shows up in the moderation inbox as actionable. Editors can flip it to
    // "handled" once they've replied or otherwise dealt with it; the
    // dashboard's "Contact Enquiries" card only counts the unread bucket.
    status: text("status").notNull().default("unread"),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    handledBy: text("handled_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contact_submissions_status_idx").on(t.status),
    index("contact_submissions_created_at_idx").on(t.createdAt),
  ],
);
