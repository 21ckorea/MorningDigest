import { NextResponse } from "next/server";
import { z } from "zod";

import { createKeywordGroup, listKeywordGroups } from "@/server/store";

const keywordSchema = z.object({
  id: z.string(),
  word: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  createdAt: z.string(),
  volume: z.string(),
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  timezone: z.string().min(1),
  sendTime: z.string().min(1),
  days: z.array(z.string()).min(1),
  keywords: z.array(keywordSchema).min(1),
  recipients: z.array(z.string().email()).min(1),
});

export async function GET() {
  const groups = await listKeywordGroups();
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

  const group = await createKeywordGroup(parseResult.data);
  return NextResponse.json({ data: group }, { status: 201 });
}
