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
    .map((article) => `
        <article style="margin-bottom:16px">
          <h3 style="margin:0 0 4px;font-size:16px">${article.headline}</h3>
          <p style="margin:0 0 4px;font-size:14px;color:#475569">${article.summary}</p>
          <a href="${article.sourceUrl}" style="font-size:14px;color:#2563eb">${article.sourceName}</a>
        </article>
      `)
    .join("");

  const html = `
    <main style="font-family:Inter,system-ui,sans-serif;padding:24px;background:#f8fafc">
      <section style="max-width:600px;margin:auto;background:#ffffff;border-radius:16px;padding:24px">
        <h1 style="font-size:22px;margin-bottom:16px">${issue.groupName} · ${issue.date}</h1>
        <p style="margin:0 0 12px;color:#475569">오늘의 핵심 이슈</p>
        <ul style="padding-left:20px;color:#1e293b">${bulletList}</ul>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />
        <div>${articlesHtml}</div>
      </section>
    </main>
  `;

  const textHighlights = issue.highlights.length
    ? issue.highlights.map((item, idx) => `${idx + 1}. ${item}`).join("\n")
    : "요약 정보가 준비중입니다.";

  const textArticles = (issue.articles ?? [])
    .map((article, idx) => `${idx + 1}. ${article.headline} (${article.sourceName})\n${article.summary}`)
    .join("\n\n");

  const text = `${issue.groupName} · ${issue.date}\n${textHighlights}\n\n${textArticles}`;

  return { subject, html, text };
}

export async function sendDigestEmail(issue: DigestIssue, recipient: string) {
  const content = renderDigestEmail(issue);
  return sendWithRotation({ ...content, to: recipient, issueId: issue.id });
}
