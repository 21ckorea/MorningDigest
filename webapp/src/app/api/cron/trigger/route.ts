import { NextResponse } from "next/server";

import { dispatchDigestIssue } from "@/server/dispatch";
import { generateDigestsForActiveGroups } from "@/server/ingestion";

const cronSecret = process.env.CRON_SECRET;

async function runDigestJob() {
  const result = await generateDigestsForActiveGroups(undefined, { bypassSchedule: true });
  const dispatch = await Promise.all(
    result
      .filter((item) => item.issue)
      .map(async (item) => ({
        issueId: item.issue!.id,
        recipients: await dispatchDigestIssue(item.issue!),
      }))
  );

  return { result, dispatch };
}

export async function POST(request: Request) {
  if (cronSecret) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { result, dispatch } = await runDigestJob();
    return NextResponse.json({
      ok: true,
      stats: {
        groupsProcessed: result.length,
        successes: result.filter((item) => item.issue).length,
        failures: result.filter((item) => item.error).length,
      },
      dispatch,
    });
  } catch (error) {
    console.error("[/api/cron/trigger]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
