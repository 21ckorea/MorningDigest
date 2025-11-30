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

  for (const recipient of targets) {
    try {
      console.info("[dispatch] sending digest email", {
        issueId: issue.id,
        groupId: issue.groupId,
        groupName: issue.groupName,
        recipient,
      });
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
