import Parser from "rss-parser";

import type { DigestArticle, DigestIssue, KeywordGroup } from "@/types";
import { computeNextDeliveryLabel, isWithinSendWindow, SEND_WINDOW_MINUTES } from "./schedule";
import { createDigestIssue, listKeywordGroups, digestIssueExists, getDeliverySettingForGroup } from "./store";

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
  {
    id: "hankyung-all",
    name: "한국경제",
    buildUrl: () => "https://www.hankyung.com/feed",
  },
  {
    id: "mk-all",
    name: "매일경제",
    buildUrl: () => "https://www.mk.co.kr/rss/40300001/",
  },
  {
    id: "yonhap-all",
    name: "연합뉴스",
    buildUrl: () => "https://www.yna.co.kr/rss/all.xml",
  },
  {
    id: "chosun-all",
    name: "조선일보",
    buildUrl: () => "https://rssplus.chosun.com/web_service/rss/rss.xml",
  },
  {
    id: "sbs-news",
    name: "SBS 뉴스",
    buildUrl: () => "https://news.sbs.co.kr/news/rss.do?plink=RSSREADER",
  },
];

const MAX_ARTICLES_PER_KEYWORD = 4;
const MAX_ARTICLES_PER_DIGEST = 8;

// HTML 본문을 추가로 스크랩하여 요약을 보강할 대상 도메인 화이트리스트
const HTML_SCRAPE_HOSTS = new Set<string>([
  "www.hankyung.com",
  "www.mk.co.kr",
  "www.yna.co.kr",
  "rssplus.chosun.com",
  "news.sbs.co.kr",
  "choice.co.kr",
]);

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

async function tryFetchArticleBody(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (!HTML_SCRAPE_HOSTS.has(parsed.host)) return null;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "MorningDigestBot/0.1 (+https://example.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const html = await response.text();

    // 매우 단순한 본문 추출: script/style 제거 후 태그를 모두 없애고 텍스트만 사용
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
    const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
    const textOnly = withoutStyles.replace(/<[^>]+>/g, " ");
    const clean = textOnly.replace(/\s+/g, " ").trim();

    return clean || null;
  } catch {
    return null;
  }
}

async function fetchArticlesForKeyword(keyword: string, maxSummaryLength: number): Promise<CandidateArticle[]> {
  const lowerKeyword = keyword.toLowerCase();
  const settlements = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      const feed = await parseFeed(source.buildUrl(keyword));
      const items = feed.items ?? [];
      const filtered = items.filter((item) => {
        const haystack = `${item.title ?? ""} ${item.contentSnippet ?? item.content ?? ""}`.toLowerCase();
        return haystack.includes(lowerKeyword);
      });

      return Promise.all(
        filtered.slice(0, MAX_ARTICLES_PER_KEYWORD).map(async (item) => {
          const headline = item.title?.trim() ?? `${keyword} 업데이트`;
          const sourceUrl = item.link ?? source.buildUrl(keyword);

          const baseSource = item.contentSnippet ?? item.content ?? "";
          let summarySource = baseSource;

          // 요약 길이가 길게 설정된 경우에는, 화이트리스트 도메인에 한해
          // HTML 본문을 추가로 스크랩하여 요약을 보강한다.
          if (maxSummaryLength >= 200 && sourceUrl) {
            const body = await tryFetchArticleBody(sourceUrl);
            if (body) {
              summarySource = body;
            }
          }

          const summary = buildSummary(summarySource, maxSummaryLength);
          const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
          const relevanceScore = scoreArticle(headline, summary, keyword, publishedAt);
          return {
            headline,
            summary,
            sourceName: source.name,
            sourceUrl,
            publishedAt,
            relevanceScore,
          } satisfies CandidateArticle;
        })
      );
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

  // 그룹별 발송 설정에서 요약 길이 프리셋을 읽어와서 실제 요약 길이에 반영한다.
  // 설정이 없다면 "standard"를 기본값으로 사용한다.
  const delivery = await getDeliverySettingForGroup(groupId);
  const preset = delivery?.summaryLength ?? "standard";
  const maxSummaryLength =
    preset === "short" ? 80 : preset === "long" ? 400 : 200;

  const articleBatches = await Promise.all(
    group.keywords.map((keyword) => fetchArticlesForKeyword(keyword.word, maxSummaryLength))
  );

  const flattened = articleBatches.flat();
  if (flattened.length === 0) {
    throw new Error(`No articles found for group ${groupId}`);
  }

  const topArticles = pickTopArticles(flattened);

  const highlights = buildHighlights(topArticles);

  // 이번 다이제스트에서 어떤 언론사에서만 기사가 나왔는지/안 나왔는지 알려주기 위해
  // 사용하는 소스 목록을 계산한다. (이 정보는 메일 하단에 간단한 문장으로 표시된다.)
  const usedSources = new Set(topArticles.map((article) => article.sourceName));
  const allSourceNames = RSS_SOURCES.map((source) => source.name);
  const missingSources = allSourceNames.filter((name) => !usedSources.has(name));

  if (missingSources.length > 0) {
    highlights.push(`이번 키워드 기준으로 기사 없음: ${missingSources.join(", ")}`);
  }

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

export async function generateDigestsForActiveGroups(
  targetGroupIds?: string[],
  options?: { bypassSchedule?: boolean }
) {
  const groups = await listKeywordGroups();
  const hasExplicitTargets = Boolean(targetGroupIds?.length);
  const shouldBypassSchedule = options?.bypassSchedule ?? false;
  const today = formatSeoulDate(new Date());
  const selected = groups.filter((group) => {
    if (hasExplicitTargets) {
      return targetGroupIds!.includes(group.id);
    }
    if (group.status !== "active") return false;
    if (shouldBypassSchedule) return true;
    // GitHub Actions 스케줄이 실제로는 수 분~수십 분씩 지연될 수 있으므로,
    // "sendTime 이후 오늘 중에 한 번이라도" 실행되면 발송되도록 상한을 하루(24시간)로 넓힌다.
    // 중복 발송은 digestIssueExists(groupId, today) 체크로 방지한다.
    const ONE_DAY_MINUTES = 24 * 60;
    return isWithinSendWindow(
      { timezone: group.timezone, sendTime: group.sendTime, days: group.days },
      ONE_DAY_MINUTES
    );
  });

  const results: Array<{
    groupId: string;
    issue?: DigestIssue;
    error?: string;
  }> = [];

  for (const group of selected) {
    try {
      if (await digestIssueExists(group.id, today)) {
        const message = "Digest already sent for today; skipping.";
        console.info("[cron] skip existing digest", {
          groupId: group.id,
          groupName: group.name,
          reason: message,
        });
        results.push({ groupId: group.id, error: message });
        continue;
      }
      const issue = await generateDigestForGroup(group.id);
      results.push({ groupId: group.id, issue });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[cron] generateDigestForGroup error", {
        groupId: group.id,
        groupName: group.name,
        error: message,
      });
      results.push({
        groupId: group.id,
        error: message,
      });
    }
  }

  return results;
}
