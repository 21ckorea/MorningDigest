import { randomUUID } from "crypto";

import { keywordGroups as seedGroups, keywords as seedKeywords } from "@/data/mockData";
import type {
  DeliveryLog,
  DeliverySetting,
  DeliveryStatus,
  NotificationSetting,
  DigestArticle,
  DigestIssue,
  DigestStatus,
  Keyword,
  KeywordGroup,
  KeywordPriority,
  User,
} from "@/types";

import { sql } from "./db";
import { computeNextDeliveryLabel } from "./schedule";

type KeywordRow = {
  id: string;
  word: string;
  priority: KeywordPriority;
  volume: string;
  created_at: string;
};

function mapKeyword(row: KeywordRow): Keyword {
  return {
    id: row.id,
    word: row.word,
    priority: row.priority,
    createdAt: row.created_at,
    volume: row.volume,
  };
}

function buildNextDeliveryLabel(data: { timezone: string; sendTime: string; days: string[] }) {
  return computeNextDeliveryLabel({ timezone: data.timezone, sendTime: data.sendTime, days: data.days });
}

type KeywordGroupRow = {
  id: string;
  name: string;
  description: string;
  timezone: string;
  send_time: string;
  days: string[];
  status: string;
  next_delivery: string;
  created_at: string;
  keywords: any;
  recipients: string[];
  owner_id: string | null;
};

type DigestIssueRow = {
  id: string;
  group_id: string;
  send_date: string;
  subject: string;
  highlights: string[];
  status: string;
  article_count: number;
  generated_at: string;
  group_name: string;
};

type DigestArticleRow = {
  id: string;
  issue_id: string;
  headline: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string;
  relevance_score: number;
};

type DeliveryLogRow = {
  id: string;
  issue_id: string;
  group_name: string;
  subject: string;
  recipient: string;
  provider: string;
  status: DeliveryStatus;
  provider_message_id: string | null;
  sent_at: string;
  error: string | null;
};

type DeliverySettingRow = {
  group_id: string;
  group_name: string;
  timezone: string;
  send_time: string;
  days: string[];
  summary_length: string | null;
  template: string | null;
  channels: string[] | null;
};

type NotificationSettingRow = {
  id: string;
  send_failure_alert: boolean;
  send_sms_backup: boolean;
  send_weekly_report: boolean;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  emailVerified: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

type DigestArticleInput = {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  relevanceScore: number;
};

type CreateDigestIssueInput = {
  groupId: string;
  groupName: string;
  subject: string;
  highlights: string[];
  articles: DigestArticleInput[];
};

const initPromise = initializeSchema();
export const schemaReady = initPromise;

function getSeoulDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

async function initializeSchema() {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      "emailVerified" TIMESTAMPTZ,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "lastLoginAt" TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at BIGINT,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      refresh_token_expires_in BIGINT,
      UNIQUE (provider, "providerAccountId")
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "sessionToken" TEXT UNIQUE NOT NULL,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL
    );
  `;

  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified'
      ) THEN
        EXECUTE 'ALTER TABLE users RENAME COLUMN email_verified TO "emailVerified"';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at'
      ) THEN
        EXECUTE 'ALTER TABLE users RENAME COLUMN created_at TO "createdAt"';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at'
      ) THEN
        EXECUTE 'ALTER TABLE users RENAME COLUMN last_login_at TO "lastLoginAt"';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'user_id'
      ) THEN
        EXECUTE 'ALTER TABLE accounts RENAME COLUMN user_id TO "userId"';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'provider_account_id'
      ) THEN
        EXECUTE 'ALTER TABLE accounts RENAME COLUMN provider_account_id TO "providerAccountId"';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'session_token'
      ) THEN
        EXECUTE 'ALTER TABLE sessions RENAME COLUMN session_token TO "sessionToken"';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'user_id'
      ) THEN
        EXECUTE 'ALTER TABLE sessions RENAME COLUMN user_id TO "userId"';
      END IF;
    END
    $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (identifier, token)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS keywords (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      priority TEXT NOT NULL,
      volume TEXT NOT NULL DEFAULT '—',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS keyword_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      timezone TEXT NOT NULL,
      send_time TEXT NOT NULL,
      days TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      next_delivery TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      recipients TEXT[] NOT NULL DEFAULT '{}',
      owner_id TEXT REFERENCES users(id)
    );
  `;

  await sql`
    ALTER TABLE keyword_groups
    ADD COLUMN IF NOT EXISTS recipients TEXT[] NOT NULL DEFAULT '{}'
  `;

  await sql`
    ALTER TABLE keyword_groups
    ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS group_keywords (
      group_id TEXT NOT NULL REFERENCES keyword_groups(id) ON DELETE CASCADE,
      keyword_id TEXT NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, keyword_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS digest_issues (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES keyword_groups(id) ON DELETE CASCADE,
      send_date DATE NOT NULL DEFAULT CURRENT_DATE,
      subject TEXT NOT NULL,
      highlights TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'sent',
      article_count INTEGER NOT NULL DEFAULT 0,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS digest_articles (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL REFERENCES digest_issues(id) ON DELETE CASCADE,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      published_at TIMESTAMPTZ NOT NULL,
      relevance_score REAL NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS delivery_logs (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL REFERENCES digest_issues(id) ON DELETE CASCADE,
      group_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      recipient TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_message_id TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      error TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS delivery_settings (
      group_id TEXT PRIMARY KEY REFERENCES keyword_groups(id) ON DELETE CASCADE,
      summary_length TEXT NOT NULL DEFAULT 'standard',
      template TEXT NOT NULL DEFAULT 'insight',
      channels TEXT[] NOT NULL DEFAULT ARRAY['email']
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      send_failure_alert BOOLEAN NOT NULL DEFAULT true,
      send_sms_backup BOOLEAN NOT NULL DEFAULT false,
      send_weekly_report BOOLEAN NOT NULL DEFAULT true
    );
  `;
}

async function fetchKeywordGroupRow(id: string): Promise<KeywordGroupRow | null> {
  const rows = (await sql`
    SELECT
      g.id,
      g.name,
      g.description,
      g.timezone,
      g.send_time,
      g.days,
      g.status,
      g.next_delivery,
      g.created_at,
      MIN(ds.summary_length) AS summary_length,
      g.recipients,
      g.owner_id,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', k.id,
            'word', k.word,
            'priority', k.priority,
            'volume', k.volume,
            'created_at', to_char(k.created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ')
          )
        ) FILTER (WHERE k.id IS NOT NULL),
        '[]'
      ) AS keywords
    FROM keyword_groups g
    LEFT JOIN delivery_settings ds ON ds.group_id = g.id
    LEFT JOIN group_keywords gk ON gk.group_id = g.id
    LEFT JOIN keywords k ON k.id = gk.keyword_id
    WHERE g.id = ${id}
    GROUP BY g.id
    LIMIT 1
  `) as KeywordGroupRow[];

  return rows[0] ?? null;
}

export async function getKeywordGroupById(id: string): Promise<KeywordGroup | null> {
  await initPromise;
  const row = await fetchKeywordGroupRow(id);
  return row ? mapGroup(row) : null;
}

function mapNotificationSetting(row: NotificationSettingRow): NotificationSetting {
  return {
    id: row.id,
    sendFailureAlert: row.send_failure_alert,
    sendSmsBackup: row.send_sms_backup,
    sendWeeklyReport: row.send_weekly_report,
  };
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: (row.role as User["role"]) ?? "member",
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
  };
}

export async function recordDeliveryLog(input: {
  issueId: string;
  groupName: string;
  subject: string;
  recipient: string;
  provider: string;
  status: DeliveryStatus;
  providerMessageId?: string | null;
  error?: string | null;
}): Promise<DeliveryLog> {
  await initPromise;
  const id = randomUUID();
  const sentAt = new Date().toISOString();
  await sql`
    INSERT INTO delivery_logs (id, issue_id, group_name, subject, recipient, provider, status, provider_message_id, sent_at, error)
    VALUES (${id}, ${input.issueId}, ${input.groupName}, ${input.subject}, ${input.recipient}, ${input.provider}, ${input.status}, ${input.providerMessageId ?? null}, ${sentAt}, ${input.error ?? null})
  `;

  return {
    id,
    issueId: input.issueId,
    groupName: input.groupName,
    subject: input.subject,
    recipient: input.recipient,
    provider: input.provider,
    status: input.status,
    providerMessageId: input.providerMessageId ?? null,
    sentAt,
    error: input.error ?? null,
  } satisfies DeliveryLog;
}

export async function listRecentDeliveryLogs(limit = 20): Promise<DeliveryLog[]> {
  await initPromise;
  const rows = (await sql`
    SELECT id,
           issue_id,
           group_name,
           subject,
           recipient,
           provider,
           status,
           provider_message_id,
           to_char(sent_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as sent_at,
           error
    FROM delivery_logs
    ORDER BY sent_at DESC
    LIMIT ${limit}
  `) as DeliveryLogRow[];

  return rows.map(mapDeliveryLog);
}

export async function listDeliveryLogsForUser(userId: string, limit = 50): Promise<DeliveryLog[]> {
  await initPromise;
  const rows = (await sql`
    SELECT dl.id,
           dl.issue_id,
           dl.group_name,
           dl.subject,
           dl.recipient,
           dl.provider,
           dl.status,
           dl.provider_message_id,
           to_char(dl.sent_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as sent_at,
           dl.error
    FROM delivery_logs dl
    JOIN digest_issues di ON di.id = dl.issue_id
    JOIN keyword_groups kg ON kg.id = di.group_id
    WHERE kg.owner_id = ${userId}
    ORDER BY dl.sent_at DESC
    LIMIT ${limit}
  `) as DeliveryLogRow[];

  return rows.map(mapDeliveryLog);
}

export async function listDeliverySettings(): Promise<DeliverySetting[]> {
  await initPromise;
  const rows = (await sql`
    SELECT g.id as group_id,
           g.name as group_name,
           g.timezone,
           g.send_time,
           g.days,
           ds.summary_length,
           ds.template,
           ds.channels
    FROM keyword_groups g
    LEFT JOIN delivery_settings ds ON ds.group_id = g.id
    ORDER BY g.created_at DESC
  `) as DeliverySettingRow[];

  return rows.map(mapDeliverySetting);
}

export async function getDeliverySettingForGroup(groupId: string): Promise<DeliverySetting | null> {
  await initPromise;
  const rows = (await sql`
    SELECT g.id as group_id,
           g.name as group_name,
           g.timezone,
           g.send_time,
           g.days,
           ds.summary_length,
           ds.template,
           ds.channels
    FROM keyword_groups g
    LEFT JOIN delivery_settings ds ON ds.group_id = g.id
    WHERE g.id = ${groupId}
    LIMIT 1
  `) as DeliverySettingRow[];

  if (rows.length === 0) return null;
  return mapDeliverySetting(rows[0]);
}

export async function listDeliverySettingsForUser(userId: string): Promise<DeliverySetting[]> {
  await initPromise;
  const rows = (await sql`
    SELECT g.id as group_id,
           g.name as group_name,
           g.timezone,
           g.send_time,
           g.days,
           ds.summary_length,
           ds.template,
           ds.channels
    FROM keyword_groups g
    LEFT JOIN delivery_settings ds ON ds.group_id = g.id
    WHERE g.owner_id = ${userId}
    ORDER BY g.created_at DESC
  `) as DeliverySettingRow[];

  return rows.map(mapDeliverySetting);
}

export async function listUsers(): Promise<User[]> {
  await initPromise;
  const rows = (await sql`
    SELECT id,
           name,
           email,
           image,
           role,
           to_char("emailVerified", 'YYYY-MM-DD"T"HH24:MI:SSZ') as "emailVerified",
           to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SSZ') as "createdAt",
           to_char("lastLoginAt", 'YYYY-MM-DD"T"HH24:MI:SSZ') as "lastLoginAt"
    FROM users
    ORDER BY "createdAt" DESC
  `) as UserRow[];

  return rows.map(mapUser);
}

export async function updateDeliverySetting(data: {
  groupId: string;
  summaryLength: DeliverySetting["summaryLength"];
  template: DeliverySetting["template"];
  channels: string[];
}) {
  await initPromise;
  await sql`
    INSERT INTO delivery_settings (group_id, summary_length, template, channels)
    VALUES (${data.groupId}, ${data.summaryLength}, ${data.template}, ${data.channels})
    ON CONFLICT (group_id)
    DO UPDATE SET summary_length = EXCLUDED.summary_length,
                  template = EXCLUDED.template,
                  channels = EXCLUDED.channels
  `;
}

export async function getNotificationSetting(): Promise<NotificationSetting> {
  await initPromise;
  const rows = (await sql`
    SELECT id,
           send_failure_alert,
           send_sms_backup,
           send_weekly_report
    FROM notification_settings
    LIMIT 1
  `) as NotificationSettingRow[];

  if (rows.length > 0) {
    return mapNotificationSetting(rows[0]);
  }

  const inserted = (await sql`
    INSERT INTO notification_settings (id)
    VALUES ('default')
    ON CONFLICT (id) DO NOTHING
    RETURNING id,
              send_failure_alert,
              send_sms_backup,
              send_weekly_report
  `) as NotificationSettingRow[];

  return mapNotificationSetting(inserted[0]);
}

export async function updateNotificationSetting(data: {
  sendFailureAlert: boolean;
  sendSmsBackup: boolean;
  sendWeeklyReport: boolean;
}) {
  await initPromise;
  await sql`
    INSERT INTO notification_settings (id, send_failure_alert, send_sms_backup, send_weekly_report)
    VALUES ('default', ${data.sendFailureAlert}, ${data.sendSmsBackup}, ${data.sendWeeklyReport})
    ON CONFLICT (id)
    DO UPDATE SET send_failure_alert = EXCLUDED.send_failure_alert,
                  send_sms_backup = EXCLUDED.send_sms_backup,
                  send_weekly_report = EXCLUDED.send_weekly_report
  `;
}

function mapDigestIssue(row: DigestIssueRow, articles: DigestArticleRow[]): DigestIssue {
  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name,
    date: row.send_date,
    subject: row.subject,
    highlights: row.highlights,
    openRate: 0,
    status: (row.status as DigestStatus) ?? "sent",
    articleCount: row.article_count,
    generatedAt: row.generated_at,
    articles: articles.map((article) => ({
      id: article.id,
      issueId: article.issue_id,
      headline: article.headline,
      summary: article.summary,
      sourceName: article.source_name,
      sourceUrl: article.source_url,
      publishedAt: article.published_at,
      relevanceScore: article.relevance_score,
    } satisfies DigestArticle)),
  };
}

function mapDeliverySetting(row: DeliverySettingRow): DeliverySetting {
  return {
    id: row.group_id,
    groupName: row.group_name,
    timezone: row.timezone,
    sendTime: row.send_time,
    days: row.days,
    summaryLength: (row.summary_length as DeliverySetting["summaryLength"]) ?? "standard",
    template: (row.template as DeliverySetting["template"]) ?? "insight",
    channels: row.channels ?? ["email"],
  };
}

function mapDeliveryLog(row: DeliveryLogRow): DeliveryLog {
  return {
    id: row.id,
    issueId: row.issue_id,
    groupName: row.group_name,
    subject: row.subject,
    recipient: row.recipient,
    provider: row.provider,
    status: row.status,
    providerMessageId: row.provider_message_id,
    sentAt: row.sent_at,
    error: row.error,
  };
}

const seedKeywordsFromGroups: Keyword[] = seedGroups.flatMap((group) => group.keywords);

function mapGroup(row: KeywordGroupRow): KeywordGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    sendTime: row.send_time,
    days: row.days,
    status: row.status === "paused" ? "paused" : "active",
    nextDelivery: row.next_delivery,
    keywords: (row.keywords as KeywordRow[] | null)?.map(mapKeyword) ?? [],
    recipients: row.recipients ?? [],
    ownerId: row.owner_id ?? undefined,
    summaryLength: (row as any).summary_length ?? undefined,
  };
}

export async function listKeywords(): Promise<Keyword[]> {
  await initPromise;
  const rows = (await sql`
    SELECT id, word, priority, volume, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as created_at
    FROM keywords
    ORDER BY created_at DESC
  `) as KeywordRow[];
  return rows.map(mapKeyword);
}

export async function getKeywordsByWords(words: string[]): Promise<Keyword[]> {
  const unique = Array.from(new Set(words.map((word) => word.trim()).filter(Boolean)));
  if (unique.length === 0) return [];
  await initPromise;
  const rows = (await sql`
    SELECT id, word, priority, volume, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as created_at
    FROM keywords
    WHERE word = ANY(${unique})
  `) as KeywordRow[];
  return rows.map(mapKeyword);
}

export async function ensureKeywordsForWords(words: string[]): Promise<Keyword[]> {
  const unique = Array.from(new Set(words.map((word) => word.trim()).filter(Boolean)));
  if (unique.length === 0) return [];

  const existing = await getKeywordsByWords(unique);
  const existingWords = new Set(existing.map((kw) => kw.word));
  const missing = unique.filter((word) => !existingWords.has(word));

  const created: Keyword[] = [];
  for (const word of missing) {
    const keyword = await createKeyword({ word, priority: "medium" });
    created.push(keyword);
  }

  return [...existing, ...created];
}

export async function createKeyword(data: { word: string; priority: Keyword["priority"] }) {
  await initPromise;
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await sql`
    INSERT INTO keywords (id, word, priority, volume, created_at)
    VALUES (${id}, ${data.word}, ${data.priority}, '—', ${createdAt})
  `;
  return {
    id,
    word: data.word,
    priority: data.priority,
    createdAt,
    volume: "—",
  } satisfies Keyword;
}

export async function updateKeyword(data: { id: string; word: string; priority: Keyword["priority"] }) {
  await initPromise;
  await sql`
    UPDATE keywords
    SET word = ${data.word},
        priority = ${data.priority}
    WHERE id = ${data.id}
  `;

  const [row] = (await sql`
    SELECT id, word, priority, volume, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as created_at
    FROM keywords
    WHERE id = ${data.id}
  `) as KeywordRow[];

  if (!row) {
    throw new Error("Keyword not found");
  }

  return mapKeyword(row);
}

export async function deleteKeyword(id: string) {
  await initPromise;
  await sql`
    DELETE FROM keywords
    WHERE id = ${id}
  `;
}

export async function listKeywordGroups(): Promise<KeywordGroup[]> {
  await initPromise;
  const rows = (await sql`
    SELECT
      g.id,
      g.name,
      g.description,
      g.timezone,
      g.send_time,
      g.days,
      g.status,
      g.next_delivery,
      g.created_at,
      MIN(ds.summary_length) AS summary_length,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', k.id,
            'word', k.word,
            'priority', k.priority,
            'volume', k.volume,
            'created_at', to_char(k.created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ')
          )
        ) FILTER (WHERE k.id IS NOT NULL),
        '[]'
      ) AS keywords,
      g.recipients,
      g.owner_id
    FROM keyword_groups g
    LEFT JOIN delivery_settings ds ON ds.group_id = g.id
    LEFT JOIN group_keywords gk ON gk.group_id = g.id
    LEFT JOIN keywords k ON k.id = gk.keyword_id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `) as KeywordGroupRow[];
  return rows.map(mapGroup);
}

export async function listKeywordGroupsForUser(userId: string): Promise<KeywordGroup[]> {
  await initPromise;
  const rows = (await sql`
    SELECT
      g.id,
      g.name,
      g.description,
      g.timezone,
      g.send_time,
      g.days,
      g.status,
      g.next_delivery,
      g.created_at,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', k.id,
            'word', k.word,
            'priority', k.priority,
            'volume', k.volume,
            'created_at', to_char(k.created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ')
          )
        ) FILTER (WHERE k.id IS NOT NULL),
        '[]'
      ) AS keywords,
      g.recipients,
      g.owner_id
    FROM keyword_groups g
    LEFT JOIN group_keywords gk ON gk.group_id = g.id
    LEFT JOIN keywords k ON k.id = gk.keyword_id
    WHERE g.owner_id = ${userId}
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `) as KeywordGroupRow[];
  return rows.map(mapGroup);
}

export async function getKeywordsByIds(ids: string[]): Promise<Keyword[]> {
  if (ids.length === 0) return [];
  await initPromise;
  const rows = (await sql`
    SELECT id, word, priority, volume, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as created_at
    FROM keywords
    WHERE id = ANY(${ids})
  `) as KeywordRow[];
  return rows.map(mapKeyword);
}

export async function createKeywordGroup(data: {
  name: string;
  description: string;
  timezone: string;
  sendTime: string;
  days: string[];
  keywords: Keyword[];
  recipients?: string[];
  ownerId?: string;
  summaryLength?: "short" | "standard" | "long";
}) {
  await initPromise;
  const id = randomUUID();
  const nextDelivery = buildNextDeliveryLabel({ timezone: data.timezone, sendTime: data.sendTime, days: data.days });
  await sql`
    INSERT INTO keyword_groups (id, name, description, timezone, send_time, days, status, next_delivery, recipients, owner_id)
    VALUES (${id}, ${data.name}, ${data.description}, ${data.timezone}, ${data.sendTime}, ${data.days}, 'active', ${nextDelivery}, ${data.recipients ?? []}, ${data.ownerId ?? null})
  `;

  await sql`
    INSERT INTO delivery_settings (group_id, summary_length, template, channels)
    VALUES (${id}, ${data.summaryLength ?? "standard"}, 'insight', ${["email"]})
    ON CONFLICT (group_id) DO NOTHING
  `;

  for (const keyword of data.keywords) {
    await sql`
      INSERT INTO group_keywords (group_id, keyword_id)
      VALUES (${id}, ${keyword.id})
      ON CONFLICT DO NOTHING
    `;
  }

  return {
    id,
    name: data.name,
    description: data.description,
    timezone: data.timezone,
    sendTime: data.sendTime,
    days: data.days,
    status: "active" as const,
    nextDelivery,
    keywords: data.keywords,
    recipients: data.recipients ?? [],
    ownerId: data.ownerId,
  } satisfies KeywordGroup;
}

export async function updateKeywordGroup(data: {
  id: string;
  name: string;
  description: string;
  timezone: string;
  sendTime: string;
  days: string[];
  status: "active" | "paused";
  keywordIds: string[];
  recipients?: string[];
  summaryLength?: "short" | "standard" | "long";
}) {
  await initPromise;
  await sql`
    UPDATE keyword_groups
    SET name = ${data.name},
        description = ${data.description},
        timezone = ${data.timezone},
        send_time = ${data.sendTime},
        days = ${data.days},
        status = ${data.status},
        recipients = ${data.recipients ?? []},
        next_delivery = ${buildNextDeliveryLabel({ timezone: data.timezone, sendTime: data.sendTime, days: data.days })}
    WHERE id = ${data.id}
  `;

  if (data.summaryLength) {
    await sql`
      INSERT INTO delivery_settings (group_id, summary_length, template, channels)
      VALUES (${data.id}, ${data.summaryLength}, 'insight', ${["email"]})
      ON CONFLICT (group_id) DO UPDATE SET summary_length = EXCLUDED.summary_length
    `;
  }

  // 그룹 설정이 바뀐 경우, 오늘 이미 생성된 digest 이슈는 제거하여
  // 새 설정으로 다시 발송될 수 있도록 처리합니다.
  const today = getSeoulDateString();
  await sql`
    DELETE FROM digest_issues
    WHERE group_id = ${data.id} AND send_date = ${today}
  `;

  await sql`
    DELETE FROM group_keywords WHERE group_id = ${data.id}
  `;

  for (const keywordId of data.keywordIds) {
    await sql`
      INSERT INTO group_keywords (group_id, keyword_id)
      VALUES (${data.id}, ${keywordId})
      ON CONFLICT DO NOTHING
    `;
  }

  const row = await fetchKeywordGroupRow(data.id);

  if (!row) {
    throw new Error("Keyword group not found");
  }

  return mapGroup(row);
}

export async function deleteKeywordGroup(id: string) {
  await initPromise;
  await sql`
    DELETE FROM keyword_groups
    WHERE id = ${id}
  `;
}

export async function setKeywordGroupStatus(data: { id: string; status: "active" | "paused" }) {
  await initPromise;
  await sql`
    UPDATE keyword_groups
    SET status = ${data.status}
    WHERE id = ${data.id}
  `;

  const row = await fetchKeywordGroupRow(data.id);
  if (!row) {
    throw new Error("Keyword group not found");
  }

  return mapGroup(row);
}

export async function createDigestIssue(input: CreateDigestIssueInput): Promise<DigestIssue> {
  await initPromise;
  const issueId = randomUUID();
  const seoulDate = getSeoulDateString();
  await sql`
    INSERT INTO digest_issues (id, group_id, send_date, subject, highlights, status, article_count)
    VALUES (${issueId}, ${input.groupId}, ${seoulDate}, ${input.subject}, ${input.highlights}, 'sent', ${input.articles.length})
  `;

  for (const article of input.articles) {
    await sql`
      INSERT INTO digest_articles (id, issue_id, headline, summary, source_name, source_url, published_at, relevance_score)
      VALUES (${randomUUID()}, ${issueId}, ${article.headline}, ${article.summary}, ${article.sourceName}, ${article.sourceUrl}, ${article.publishedAt}, ${article.relevanceScore})
    `;
  }

  const [issueRow] = (await sql`
    SELECT di.id,
           di.group_id,
           di.send_date::text,
           di.subject,
           di.highlights,
           di.status,
           di.article_count,
           to_char(di.generated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as generated_at,
           kg.name as group_name
    FROM digest_issues di
    JOIN keyword_groups kg ON kg.id = di.group_id
    WHERE di.id = ${issueId}
  `) as DigestIssueRow[];

  const articleRows = (await sql`
    SELECT id,
           issue_id,
           headline,
           summary,
           source_name,
           source_url,
           to_char(published_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as published_at,
           relevance_score
    FROM digest_articles
    WHERE issue_id = ${issueId}
    ORDER BY published_at DESC
  `) as DigestArticleRow[];

  if (!issueRow) {
    throw new Error("Failed to load created digest issue");
  }

  return mapDigestIssue(issueRow, articleRows);
}

export async function getDigestIssueById(issueId: string): Promise<DigestIssue | null> {
  await initPromise;
  const issueRows = (await sql`
    SELECT di.id,
           di.group_id,
           di.send_date::text,
           di.subject,
           di.highlights,
           di.status,
           di.article_count,
           to_char(di.generated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as generated_at,
           kg.name as group_name
    FROM digest_issues di
    JOIN keyword_groups kg ON kg.id = di.group_id
    WHERE di.id = ${issueId}
    LIMIT 1
  `) as DigestIssueRow[];

  if (issueRows.length === 0) return null;

  const articleRows = (await sql`
    SELECT id,
           issue_id,
           headline,
           summary,
           source_name,
           source_url,
           to_char(published_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as published_at,
           relevance_score
    FROM digest_articles
    WHERE issue_id = ${issueId}
    ORDER BY published_at DESC
  `) as DigestArticleRow[];

  return mapDigestIssue(issueRows[0], articleRows);
}

export async function getDigestIssueForUser(issueId: string, userId: string): Promise<DigestIssue | null> {
  await initPromise;
  const issueRows = (await sql`
    SELECT di.id,
           di.group_id,
           di.send_date::text,
           di.subject,
           di.highlights,
           di.status,
           di.article_count,
           to_char(di.generated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as generated_at,
           kg.name as group_name
    FROM digest_issues di
    JOIN keyword_groups kg ON kg.id = di.group_id
    WHERE di.id = ${issueId}
      AND kg.owner_id = ${userId}
    LIMIT 1
  `) as DigestIssueRow[];

  if (issueRows.length === 0) return null;

  const articleRows = (await sql`
    SELECT id,
           issue_id,
           headline,
           summary,
           source_name,
           source_url,
           to_char(published_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as published_at,
           relevance_score
    FROM digest_articles
    WHERE issue_id = ${issueId}
    ORDER BY published_at DESC
  `) as DigestArticleRow[];

  return mapDigestIssue(issueRows[0], articleRows);
}

export async function listRecentDigestIssues(limit = 5): Promise<DigestIssue[]> {
  await initPromise;
  const issueRows = (await sql`
    SELECT di.id,
           di.group_id,
           di.send_date::text,
           di.subject,
           di.highlights,
           di.status,
           di.article_count,
           to_char(di.generated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as generated_at,
           kg.name as group_name
    FROM digest_issues di
    JOIN keyword_groups kg ON kg.id = di.group_id
    ORDER BY di.generated_at DESC
    LIMIT ${limit}
  `) as DigestIssueRow[];

  const ids = issueRows.map((issue) => issue.id);
  const articleRows = ids.length
    ? ((await sql`
        SELECT id,
               issue_id,
               headline,
               summary,
               source_name,
               source_url,
               to_char(published_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as published_at,
               relevance_score
        FROM digest_articles
        WHERE issue_id = ANY(${ids})
        ORDER BY published_at DESC
      `) as DigestArticleRow[])
    : [];

  const grouped = new Map<string, DigestArticleRow[]>();
  for (const article of articleRows) {
    const list = grouped.get(article.issue_id) ?? [];
    list.push(article);
    grouped.set(article.issue_id, list);
  }

  return issueRows.map((issue) => mapDigestIssue(issue, grouped.get(issue.id) ?? []));
}

export async function resetStores() {
  await initPromise;
  await sql`TRUNCATE notification_settings, delivery_settings, delivery_logs, digest_articles, digest_issues, group_keywords, keyword_groups, keywords`;

  for (const keyword of seedKeywordsFromGroups) {
    await sql`
      INSERT INTO keywords (id, word, priority, volume, created_at)
      VALUES (${keyword.id}, ${keyword.word}, ${keyword.priority}, ${keyword.volume}, ${keyword.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const group of seedGroups) {
    await sql`
      INSERT INTO keyword_groups (id, name, description, timezone, send_time, days, status, next_delivery, created_at, recipients)
      VALUES (${group.id}, ${group.name}, ${group.description}, ${group.timezone}, ${group.sendTime}, ${group.days}, ${group.status}, ${group.nextDelivery}, NOW(), ${group.recipients ?? []})
      ON CONFLICT (id) DO NOTHING
    `;

    await sql`
      INSERT INTO delivery_settings (group_id, summary_length, template, channels)
      VALUES (${group.id}, 'standard', 'insight', ${["email"]})
      ON CONFLICT (group_id) DO NOTHING
    `;

    for (const keyword of group.keywords) {
      await sql`
        INSERT INTO group_keywords (group_id, keyword_id)
        VALUES (${group.id}, ${keyword.id})
        ON CONFLICT DO NOTHING
      `;
    }
  }
}

function getSeoulDateOnly(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export async function digestIssueExists(groupId: string, date: string): Promise<boolean> {
  const row = await sql`
    SELECT 1
    FROM digest_issues
    WHERE group_id = ${groupId} AND send_date = ${date}
  `;
  return row.length > 0;
}

export async function getMostRecentDigestIssue(groupId: string): Promise<DigestIssue | null> {
  const issueRow = (await sql`
    SELECT di.id,
           di.group_id,
           di.send_date::text,
           di.subject,
           di.highlights,
           di.status,
           di.article_count,
           to_char(di.generated_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as generated_at,
           kg.name as group_name
    FROM digest_issues di
    JOIN keyword_groups kg ON kg.id = di.group_id
    WHERE di.group_id = ${groupId}
    ORDER BY di.generated_at DESC
    LIMIT 1
  `) as DigestIssueRow[];

  if (!issueRow.length) {
    return null;
  }

  const articleRows = (await sql`
    SELECT id,
           issue_id,
           headline,
           summary,
           source_name,
           source_url,
           to_char(published_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') as published_at,
           relevance_score
    FROM digest_articles
    WHERE issue_id = ${issueRow[0].id}
    ORDER BY published_at DESC
  `) as DigestArticleRow[];

  return mapDigestIssue(issueRow[0], articleRows);
}
