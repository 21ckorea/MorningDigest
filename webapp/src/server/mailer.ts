import type { DigestIssue } from "@/types";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  issueId: string;
}

interface MailerClient {
  send(payload: EmailPayload): Promise<{ id: string }>;
}

class ConsoleMailer implements MailerClient {
  async send(payload: EmailPayload) {
    console.info("[mail]", payload.subject, payload.to);
    return { id: `local-${Date.now()}` };
  }
}

type MailerEntry = { label: string; client: MailerClient };

let mailers: MailerEntry[] | null = null;
let roundRobinIndex = 0;

function resolveApiKeys(): string[] {
  const raw = process.env.RESEND_API_KEYS ?? process.env.RESEND_API_KEY ?? "";
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function initializeMailers(): MailerEntry[] {
  if (mailers) return mailers;

  const keys = resolveApiKeys();
  if (keys.length === 0) {
    mailers = [{ label: "console", client: new ConsoleMailer() }];
    return mailers;
  }

  const { Resend } = require("resend");
  mailers = keys.map((key, index) => {
    const resend = new Resend(key);
    return {
      label: `resend-${index + 1}`,
      client: {
        async send(payload) {
          const response = await resend.emails.send({
            from: process.env.RESEND_FROM ?? "MorningDigest <digest@example.com>",
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
          });
          if (!response || response.error) {
            throw new Error(response?.error?.message ?? "Resend send failed");
          }
          return { id: response.id ?? "resend" };
        },
      },
    } satisfies MailerEntry;
  });

  return mailers;
}

async function sendWithRotation(payload: EmailPayload) {
  const clients = initializeMailers();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < clients.length; attempt += 1) {
    const index = (roundRobinIndex + attempt) % clients.length;
    const entry = clients[index];
    try {
      const result = await entry.client.send(payload);
      roundRobinIndex = (index + 1) % clients.length;
      return { providerLabel: entry.label, messageId: result.id };
    } catch (error) {
      lastError = error;
      console.warn(`[mail:${entry.label}]`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All mail providers failed");
}

export function renderDigestEmail(issue: DigestIssue): { subject: string; html: string; text: string } {
  const subject = issue.subject;
  const bulletList = issue.highlights.length
    ? issue.highlights.map((item) => `<li>${item}</li>`).join("")
    : "<li>요약 정보가 준비중입니다.</li>";

  const articlesHtml = (issue.articles ?? [])
    .map((article) => {
      const headline = (article.headline ?? "").trim();
      const rawSummary = (article.summary ?? "").trim();
      const source = article.sourceName ?? "";
      const publishedAt = (article.publishedAt ?? "").slice(0, 10);

      // 제목과 거의 같은 내용(완전 동일하거나, 제목으로 시작하고 몇 글자만 다른 경우)은
      // 요약으로 보여주지 않는다.
      const isVerySimilarToHeadline = (() => {
        if (!rawSummary || !headline) return false;
        if (rawSummary === headline) return true;
        if (rawSummary.startsWith(headline)) {
          const extra = rawSummary.slice(headline.length).trim();
          if (extra.length <= 8) return true;
        }
        return false;
      })();

      const hasDistinctSummary = Boolean(rawSummary && !isVerySimilarToHeadline);
      const summaryHtml = hasDistinctSummary
        ? `<p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#475569">${rawSummary}</p>`
        : "";

      const metaLine = [source, publishedAt].filter(Boolean).join(" · ");

      return `
        <article style="margin-bottom:12px;border-radius:12px;border:1px solid #e2e8f0;padding:12px 14px;background:#ffffff">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b">${metaLine}</p>
          <h3 style="margin:0 0 6px;font-size:16px;line-height:1.5;color:#0f172a">${headline}</h3>
          ${summaryHtml}
          <a href="${article.sourceUrl}" style="display:inline-block;margin-top:2px;font-size:13px;font-weight:500;color:#2563eb;text-decoration:none">원문 보기 →</a>
        </article>
      `;
    })
    .join("");

  const html = `
    <main style="font-family:Inter,system-ui,sans-serif;padding:24px;background:#f1f5f9">
      <section style="max-width:640px;margin:auto;background:#ffffff;border-radius:18px;padding:24px 24px 20px;border:1px solid #e2e8f0">
        <header style="margin-bottom:18px">
          <h1 style="font-size:22px;margin:0 0 4px;color:#0f172a">${issue.groupName} · ${issue.date}</h1>
          <p style="margin:0 0 10px;color:#64748b;font-size:14px">오늘의 핵심 이슈</p>
          <ul style="margin:0;padding-left:20px;color:#1e293b;font-size:14px;line-height:1.5">${bulletList}</ul>
        </header>
        <div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px">
          ${articlesHtml}
        </div>
      </section>
    </main>
  `;

  const textHighlights = issue.highlights.length
    ? issue.highlights.map((item, idx) => `${idx + 1}. ${item}`).join("\n")
    : "요약 정보가 준비중입니다.";

  const textArticles = (issue.articles ?? [])
    .map((article, idx) => {
      const headline = (article.headline ?? "").trim();
      const rawSummary = (article.summary ?? "").trim();

      const isVerySimilarToHeadline = (() => {
        if (!rawSummary || !headline) return false;
        if (rawSummary === headline) return true;
        if (rawSummary.startsWith(headline)) {
          const extra = rawSummary.slice(headline.length).trim();
          if (extra.length <= 8) return true;
        }
        return false;
      })();

      const hasDistinctSummary = Boolean(rawSummary && !isVerySimilarToHeadline);
      const summaryText = hasDistinctSummary ? `\n${rawSummary}` : "";
      return `${idx + 1}. ${headline} (${article.sourceName})${summaryText}`;
    })
    .join("\n\n");

  const text = `${issue.groupName} · ${issue.date}\n${textHighlights}\n\n${textArticles}`;

  return { subject, html, text };
}

export async function sendDigestEmail(issue: DigestIssue, recipient: string) {
  const content = renderDigestEmail(issue);
  return sendWithRotation({ ...content, to: recipient, issueId: issue.id });
}
