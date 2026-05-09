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
  // Editorial workflow status. Tracks the submission through the
  // editorial pipeline: submitted → reviewing → approved → revisions →
  // published | rejected. Distinct from the inbox `status` field which
  // only tracks whether the submission has been looked at.
  editorialStatus: text("editorial_status").notNull().default("submitted"),
  // Free-text internal notes from the editor (not visible to the
  // contributor). Used to record feedback, revision requests, or
  // reasons for rejection.
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
