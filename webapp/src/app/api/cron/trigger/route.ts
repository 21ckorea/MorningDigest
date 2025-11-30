import { NextResponse } from "next/server";

import { dispatchDigestIssue } from "@/server/dispatch";
import { generateDigestsForActiveGroups } from "@/server/ingestion";
import { getKeywordGroupById } from "@/server/store";

const cronSecret = process.env.CRON_SECRET;

async function runDigestJob() {
  const result = await generateDigestsForActiveGroups(undefined, { bypassSchedule: false });
  console.info("[cron] generateDigestsForActiveGroups result", {
    timestamp: new Date().toISOString(),
    groupsProcessed: result.length,
    successes: result.filter((item) => item.issue).length,
    failures: result.filter((item) => item.error).length,
  });
  const dispatch = await Promise.all(
    result
      .filter((item) => item.issue)
      .map(async (item) => {
        const group = await getKeywordGroupById(item.groupId);
        const recipients = group?.recipients && group.recipients.length ? group.recipients : undefined;
        return {
          issueId: item.issue!.id,
          recipients: await dispatchDigestIssue(item.issue!, recipients),
        };
      })
  );

  return { result, dispatch };
}

export async function POST(request: Request) {
  if (cronSecret) {
    const providedLegacy = request.headers.get("x-cron-secret");
    const providedAuth = request.headers.get("authorization");
    const expectedAuth = `Bearer ${cronSecret}`;

    const authorized =
      providedLegacy === cronSecret ||
      (typeof providedAuth === "string" && providedAuth.trim() === expectedAuth);

    if (!authorized) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { result, dispatch } = await runDigestJob();
    console.info("[cron] dispatchDigestIssue summary", {
      timestamp: new Date().toISOString(),
      groupsProcessed: result.length,
      successes: result.filter((item) => item.issue).length,
      failures: result.filter((item) => item.error).length,
    });
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
