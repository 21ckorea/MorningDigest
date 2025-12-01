import type { DigestIssue, DeliveryStatus } from "@/types";

import { sendDigestEmail } from "./mailer";
import { recordDeliveryLog } from "./store";

export interface DispatchResult {
  recipient: string;
  status: DeliveryStatus;
  providerLabel?: string;
  messageId?: string;
  error?: string;
}

function resolveTestRecipients(): string[] {
  const raw = process.env.DIGEST_TEST_RECIPIENTS ?? process.env.DISPATCH_TEST_RECIPIENTS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

const RATE_LIMIT_DELAY_MS = 600; // Resend: 2 requests/sec 제한을 고려한 간단한 딜레이

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRateLimit(issue: DigestIssue, recipient: string) {
  let attempt = 0;
  // 최대 3번까지 재시도 (429: Too many requests 대응)
  while (true) {
    try {
      return await sendDigestEmail(issue, recipient);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Too many requests") && attempt < 2) {
        const backoff = RATE_LIMIT_DELAY_MS * (attempt + 1);
        console.warn("[dispatch] rate limited by provider, retrying", {
          recipient,
          attempt: attempt + 1,
          backoff,
        });
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
}

export async function dispatchDigestIssue(issue: DigestIssue, recipients?: string[]): Promise<DispatchResult[]> {
  const explicit = (recipients ?? []).filter(Boolean);
  const testRecipients = resolveTestRecipients();
  const targets =
    explicit.length > 0
      ? explicit
      : testRecipients.length > 0
      ? testRecipients
      : ["dev@example.com"];
  const results: DispatchResult[] = [];

  for (let index = 0; index < targets.length; index += 1) {
    const recipient = targets[index];
    // 초당 2건 제한을 맞추기 위해 연속 호출 사이에 약간 딜레이를 둔다.
    if (index > 0) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
    try {
      console.info("[dispatch] sending digest email", {
        issueId: issue.id,
        groupId: issue.groupId,
        groupName: issue.groupName,
        recipient,
      });
      const { providerLabel, messageId } = await sendWithRateLimit(issue, recipient);
      await recordDeliveryLog({
        issueId: issue.id,
        groupName: issue.groupName,
        subject: issue.subject,
        recipient,
        provider: providerLabel,
        status: "sent",
        providerMessageId: messageId,
      });
      console.info("[dispatch] email sent", {
        issueId: issue.id,
        groupId: issue.groupId,
        groupName: issue.groupName,
        recipient,
        providerLabel,
        messageId,
      });
      results.push({ recipient, status: "sent", providerLabel, messageId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await recordDeliveryLog({
        issueId: issue.id,
        groupName: issue.groupName,
        subject: issue.subject,
        recipient,
        provider: "mailer",
        status: "failed",
        error: message,
      });
      console.error("[dispatch] email failed", {
        issueId: issue.id,
        groupId: issue.groupId,
        groupName: issue.groupName,
        recipient,
        error: message,
      });
      results.push({ recipient, status: "failed", error: message });
    }
  }

  return results;
}
