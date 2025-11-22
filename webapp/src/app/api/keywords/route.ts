import { NextResponse } from "next/server";
import { z } from "zod";

import { createKeyword, listKeywords } from "@/server/store";

const createKeywordSchema = z.object({
  word: z.string().min(1, "키워드를 입력하세요").max(80),
  priority: z.enum(["high", "medium", "low"]),
});

export async function GET() {
  const keywords = await listKeywords();
  return NextResponse.json({ data: keywords });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "올바른 JSON 형식이 아닙니다." }, { status: 400 });
  }

  const parseResult = createKeywordSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "유효성 검사 오류" },
      { status: 400 }
    );
  }

  const keyword = await createKeyword(parseResult.data);
  return NextResponse.json({ data: keyword }, { status: 201 });
}
