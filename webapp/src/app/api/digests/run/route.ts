import { NextResponse } from "next/server";
import { z } from "zod";

import { generateDigestsForActiveGroups } from "@/server/ingestion";
import { dispatchDigestIssue } from "@/server/dispatch";

const payloadSchema = z.object({
  groupIds: z.array(z.string().min(1)).optional(),
  sendEmails: z.boolean().optional(),
  recipients: z.array(z.string().email()).optional(),
});

function summarize(result: Awaited<ReturnType<typeof generateDigestsForActiveGroups>>) {
  return {
    groupsProcessed: result.length,
    successes: result.filter((item) => item.issue).length,
    failures: result.filter((item) => item.error).length,
  };
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const body = payloadSchema.parse(json);

    const result = await generateDigestsForActiveGroups(body.groupIds, {
      bypassSchedule: body.sendEmails === true,
    });
    const dispatch = body.sendEmails
      ? await Promise.all(
          result
            .filter((item) => item.issue)
            .map(async (item) => ({
              issueId: item.issue!.id,
              recipients: await dispatchDigestIssue(item.issue!, body.recipients),
            }))
        )
      : undefined;

    return NextResponse.json({ ok: true, stats: summarize(result), details: result, dispatch });
  } catch (error) {
    console.error("[api/digests/run]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupIdsParam = url.searchParams.get("groupIds");
  const groupIds = groupIdsParam?.split(",").filter(Boolean);
  const sendEmails = url.searchParams.get("sendEmails") === "true";
  const recipientsParam = url.searchParams.get("recipients");
  const recipients = recipientsParam?.split(",").map((email) => email.trim()).filter(Boolean);

  const result = await generateDigestsForActiveGroups(groupIds && groupIds.length ? groupIds : undefined, {
    bypassSchedule: sendEmails,
  });
  const dispatch = sendEmails
    ? await Promise.all(
        result
          .filter((item) => item.issue)
          .map(async (item) => ({
            issueId: item.issue!.id,
            recipients: await dispatchDigestIssue(item.issue!, recipients && recipients.length ? recipients : undefined),
          }))
      )
    : undefined;

  return NextResponse.json({ ok: true, stats: summarize(result), details: result, dispatch });
}
