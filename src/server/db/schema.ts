import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  nickname: text("nickname"),
  providerNickname: text("provider_nickname"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const deletedAuthAccountMarkers = pgTable(
  "deleted_auth_account_markers",
  {
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    userId: uuid("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    deletedAuthAccountUnique: uniqueIndex("deleted_auth_account_markers_unique_key").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

export const authSessionStates = pgTable("auth_session_states", {
  userId: uuid("user_id").primaryKey(),
  sessionVersion: integer("session_version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const authUserMap = pgTable(
  "auth_user_map",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex("auth_user_map_provider_unique").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

export const loginTickets = pgTable(
  "login_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    targetApp: text("target_app").notNull(),
    ticketType: text("ticket_type").notNull(),
    ticketHash: text("ticket_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("login_tickets_user_id_idx").on(table.userId),
    expiresAtIdx: index("login_tickets_expires_at_idx").on(table.expiresAt),
  })
);
