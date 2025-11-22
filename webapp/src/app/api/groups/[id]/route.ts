import { NextResponse } from "next/server";

import { z } from "zod";

import { deleteKeywordGroup, updateKeywordGroup } from "@/server/store";

const updateGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  timezone: z.string().min(1),
  sendTime: z.string().min(1),
  days: z.array(z.string()).min(1),
  keywordIds: z.array(z.string()).min(1),
  status: z.enum(["active", "paused"]),
  recipients: z.array(z.string().email()).min(1),
});

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = context.params instanceof Promise ? await context.params : context.params;
  await deleteKeywordGroup(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const body = await request.json();
    const data = updateGroupSchema.parse(body);
    const { id } = context.params instanceof Promise ? await context.params : context.params;
    const group = await updateKeywordGroup({ id, ...data });
    return NextResponse.json({ data: group });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "그룹 수정 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}
