import Parser from "rss-parser";

import type { DigestArticle, DigestIssue, KeywordGroup } from "@/types";
import { createDigestIssue, listKeywordGroups } from "./store";

const parser = new Parser({
  customFields: {
    item: ["isoDate"],
  },
});

const RSS_SOURCES = [
  {
    id: "google-news",
    name: "Google 뉴스",
    buildUrl: (keyword: string) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR%3Ako`,
  },
  {
    id: "bing-news",
    name: "Bing 뉴스",
    buildUrl: (keyword: string) =>
      `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`,
  },
];

const MAX_ARTICLES_PER_KEYWORD = 4;
const MAX_ARTICLES_PER_DIGEST = 8;

type CandidateArticle = {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  relevanceScore: number;
};

async function parseFeed(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MorningDigestBot/0.1 (+https://example.com)",
      Accept: "application/rss+xml, application/xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load RSS feed ${url}`);
  }

  const xml = await response.text();
  return parser.parseString(xml);
}

async function fetchArticlesForKeyword(keyword: string): Promise<CandidateArticle[]> {
  const settlements = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      const feed = await parseFeed(source.buildUrl(keyword));
      const items = feed.items ?? [];
      return items.slice(0, MAX_ARTICLES_PER_KEYWORD).map((item) => {
        const headline = item.title?.trim() ?? `${keyword} 업데이트`;
        const summary = buildSummary(item.contentSnippet ?? item.content ?? "");
        const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
        const sourceUrl = item.link ?? source.buildUrl(keyword);
        const relevanceScore = scoreArticle(headline, summary, keyword, publishedAt);
        return {
          headline,
          summary,
          sourceName: source.name,
          sourceUrl,
          publishedAt,
          relevanceScore,
        } satisfies CandidateArticle;
      });
    })
  );

  const articles: CandidateArticle[] = [];
  for (const settlement of settlements) {
    if (settlement.status === "fulfilled") {
      articles.push(...settlement.value);
    }
  }

  return deduplicateArticles(articles);
}

function buildSummary(raw: string, maxLength = 200): string {
  if (!raw) return "요약 가능한 콘텐츠가 제공되지 않았습니다.";
  const clean = raw.replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean;
}

function scoreArticle(headline: string, summary: string, keyword: string, publishedAt: string): number {
  const recencyHours = Math.max(1, (Date.now() - Date.parse(publishedAt)) / (1000 * 60 * 60));
  const keywordMatch = new RegExp(keyword, "i").test(`${headline} ${summary}`) ? 1 : 0;
  const freshnessScore = 1 / recencyHours;
  return Number((freshnessScore + keywordMatch).toFixed(3));
}

function deduplicateArticles(articles: CandidateArticle[]): CandidateArticle[] {
  const seen = new Map<string, CandidateArticle>();
  for (const article of articles) {
    const key = article.sourceUrl ?? article.headline;
    if (!seen.has(key)) {
      seen.set(key, article);
    }
  }
  return Array.from(seen.values());
}

function pickTopArticles(articles: CandidateArticle[]): CandidateArticle[] {
  return articles
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_ARTICLES_PER_DIGEST);
}

function buildHighlights(articles: CandidateArticle[]): string[] {
  return articles.slice(0, 3).map((article) => `${article.headline} · ${article.sourceName}`);
}

function buildSubject(group: KeywordGroup, date = new Date()): string {
  return `${group.name} 주요 이슈 - ${formatSeoulDate(date)}`;
}

function formatSeoulDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function generateDigestForGroup(groupId: string) {
  const groups = await listKeywordGroups();
  const group = groups.find((candidate) => candidate.id === groupId);

  if (!group) {
    throw new Error(`Keyword group ${groupId} not found`);
  }

  if (group.keywords.length === 0) {
    throw new Error(`Keyword group ${groupId} has no keywords; skip digest generation.`);
  }

  const articleBatches = await Promise.all(
    group.keywords.map((keyword) => fetchArticlesForKeyword(keyword.word))
  );

  const flattened = articleBatches.flat();
  if (flattened.length === 0) {
    throw new Error(`No articles found for group ${groupId}`);
  }

  const topArticles = pickTopArticles(flattened);
  const highlights = buildHighlights(topArticles);

  return createDigestIssue({
    groupId: group.id,
    groupName: group.name,
    subject: buildSubject(group),
    highlights,
    articles: topArticles.map((article, index) => ({
      headline: article.headline,
      summary: article.summary,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
      publishedAt: article.publishedAt,
      relevanceScore: Number((article.relevanceScore - index * 0.05).toFixed(3)),
    } satisfies Omit<DigestArticle, "id" | "issueId">)),
  });
}

export async function generateDigestsForActiveGroups(targetGroupIds?: string[]) {
  const groups = await listKeywordGroups();
  const selected = groups.filter((group) => {
    if (group.status !== "active") return false;
    if (!targetGroupIds) return true;
    return targetGroupIds.includes(group.id);
  });

  const results: Array<{
    groupId: string;
    issue?: DigestIssue;
    error?: string;
  }> = [];

  for (const group of selected) {
    try {
      const issue = await generateDigestForGroup(group.id);
      results.push({ groupId: group.id, issue });
    } catch (error) {
      results.push({
        groupId: group.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
