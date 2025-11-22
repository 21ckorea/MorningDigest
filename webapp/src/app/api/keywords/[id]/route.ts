import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteKeyword, updateKeyword } from "@/server/store";

const updateSchema = z.object({
  word: z.string().min(1).max(80),
  priority: z.enum(["high", "medium", "low"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const body = await request.json();
    const data = updateSchema.parse(body);
    const { id } = context.params instanceof Promise ? await context.params : context.params;
    const keyword = await updateKeyword({ id, ...data });
    return NextResponse.json({ data: keyword });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "키워드 수정 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = context.params instanceof Promise ? await context.params : context.params;
  await deleteKeyword(id);
  return NextResponse.json({ ok: true });
}
