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

function resolveRecipients(): string[] {
  const raw = process.env.DIGEST_TEST_RECIPIENTS ?? process.env.DISPATCH_TEST_RECIPIENTS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function dispatchDigestIssue(issue: DigestIssue, recipients = resolveRecipients()): Promise<DispatchResult[]> {
  const targets = recipients.length > 0 ? recipients : ["dev@example.com"];
  const results: DispatchResult[] = [];

  for (const recipient of targets) {
    try {
      const { providerLabel, messageId } = await sendDigestEmail(issue, recipient);
      await recordDeliveryLog({
        issueId: issue.id,
        groupName: issue.groupName,
        subject: issue.subject,
        recipient,
        provider: providerLabel,
        status: "sent",
        providerMessageId: messageId,
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
      results.push({ recipient, status: "failed", error: message });
    }
  }

  return results;
}
