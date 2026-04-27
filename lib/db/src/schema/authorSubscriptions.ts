import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { newsletterSubscribersTable } from "./newsletterSubscribers";

export const authorSubscriptionsTable = pgTable(
  "author_subscriptions",
  {
    id: serial("id").primaryKey(),
    subscriberId: integer("subscriber_id")
      .notNull()
      .references(() => newsletterSubscribersTable.id, { onDelete: "cascade" }),
    authorSlug: text("author_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    subscriberAuthorUnique: uniqueIndex(
      "author_subscriptions_subscriber_author_unique",
    ).on(table.subscriberId, table.authorSlug),
    authorSlugIdx: index("author_subscriptions_author_slug_idx").on(
      table.authorSlug,
    ),
  }),
);
