export type KeywordPriority = "high" | "medium" | "low";

export type DigestStatus = "scheduled" | "sending" | "sent";

export interface Keyword {
  id: string;
  word: string;
  priority: KeywordPriority;
  createdAt: string;
  volume: string;
}

export interface KeywordGroup {
  id: string;
  name: string;
  description: string;
  timezone: string;
  sendTime: string;
  days: string[];
  status: "active" | "paused";
  nextDelivery: string;
  keywords: Keyword[];
  recipients: string[];
}

export interface DigestArticle {
  id: string;
  issueId: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  relevanceScore: number;
}

export interface DigestIssue {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  subject: string;
  highlights: string[];
  openRate: number;
  status: DigestStatus;
  articleCount: number;
  generatedAt: string;
  articles?: DigestArticle[];
}

export interface DeliverySetting {
  id: string;
  groupName: string;
  timezone: string;
  sendTime: string;
  days: string[];
  summaryLength: "short" | "standard" | "long";
  template: "compact" | "insight" | "full";
  channels: string[];
}

export type DeliveryStatus = "pending" | "sent" | "failed";

export interface DeliveryLog {
  id: string;
  issueId: string;
  groupName: string;
  subject: string;
  recipient: string;
  provider: string;
  status: DeliveryStatus;
  providerMessageId?: string | null;
  sentAt: string;
  error?: string | null;
}

export interface NotificationSetting {
  id: string;
  sendFailureAlert: boolean;
  sendSmsBackup: boolean;
  sendWeeklyReport: boolean;
}

export interface ActivityLog {
  id: string;
  type: "info" | "warning" | "success";
  message: string;
  timestamp: string;
}
