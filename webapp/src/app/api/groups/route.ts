import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail } from "@/server/auth";
import { createKeywordGroup, ensureKeywordsForWords, listKeywordGroups, listKeywordGroupsForUser } from "@/server/store";

const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  timezone: z.string().min(1),
  sendTime: z.string().min(1),
  days: z.array(z.string()).min(1),
  // 쉼표로 구분해 입력된 키워드를 파싱한 문자열 배열
  keywords: z.array(z.string().min(1)).min(1),
  recipients: z.array(z.string().email()).min(1),
  summaryLength: z.enum(["short", "standard", "long"]).default("standard"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!session || !email || !userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const isAdmin = isAdminEmail(email);
  const groups = isAdmin ? await listKeywordGroups() : await listKeywordGroupsForUser(userId);
  return NextResponse.json({ data: groups });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "올바른 JSON 형식이 아닙니다." }, { status: 400 });
  }

  const parseResult = createGroupSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "유효성 검사 오류" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!session || !email || !userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const keywordList = await ensureKeywordsForWords(parseResult.data.keywords);

  const group = await createKeywordGroup({
    name: parseResult.data.name,
    description: parseResult.data.description,
    timezone: parseResult.data.timezone,
    sendTime: parseResult.data.sendTime,
    days: parseResult.data.days,
    keywords: keywordList,
    recipients: parseResult.data.recipients,
    summaryLength: parseResult.data.summaryLength,
    ownerId: userId,
  });
  return NextResponse.json({ data: group }, { status: 201 });
}
