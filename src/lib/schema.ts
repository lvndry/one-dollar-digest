import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  source: text("source").notNull(),
  sources: text("sources"),
  category: text("category", { enum: ["tech", "politics"] }).notNull(),
  subcategory: text("subcategory"),
  bias: text("bias", {
    enum: ["far-left", "left", "center", "right", "far-right"],
  }),
  publishedAt: text("published_at").notNull(),
  readingTimeMinutes: integer("reading_time_minutes"),
  importanceScore: real("importance_score"),
  imageUrl: text("image_url"),
  tags: text("tags"),
  regions: text("regions"),
  primaryRegion: text("primary_region"),
  strategicInterpretation: text("strategic_interpretation"),
  technicalSignificance: text("technical_significance"),
  digestDate: text("digest_date").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleCategory = Article["category"];

export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  subscribed: integer("subscribed", { mode: "boolean" }).default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const bookmarks = sqliteTable(
  "bookmark",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (bookmark) => ({
    pk: primaryKey({ columns: [bookmark.userId, bookmark.articleId] }),
  }),
);

export type Bookmark = typeof bookmarks.$inferSelect;

export const apiKeys = sqliteTable("api_key", {
  userId: text("user_id")
    .notNull()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
