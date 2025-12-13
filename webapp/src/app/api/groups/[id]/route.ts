import { NextResponse } from "next/server";

import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail } from "@/server/auth";
import { deleteKeywordGroup, ensureKeywordsForWords, getKeywordGroupById, updateKeywordGroup } from "@/server/store";

const updateGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  timezone: z.string().min(1),
  sendTime: z.string().min(1),
  days: z.array(z.string()).min(1),
  // 쉼표로 구분해 입력된 키워드를 파싱한 문자열 배열
  keywords: z.array(z.string().min(1)).min(1),
  status: z.enum(["active", "paused"]),
  recipients: z.array(z.string().email()).min(1),
});

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;
  if (!session || !email || !userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = context.params instanceof Promise ? await context.params : context.params;
  const group = await getKeywordGroupById(id);
  if (!group) {
    return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
  }

  const isOwner = group.ownerId === userId || group.ownerId == null;
  const isAdmin = isAdminEmail(email);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "이 그룹을 삭제할 권한이 없습니다." }, { status: 403 });
  }

  await deleteKeywordGroup(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const userId = (session?.user as { id?: string } | null)?.id;
    if (!session || !email || !userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const data = updateGroupSchema.parse(body);
    const { id } = context.params instanceof Promise ? await context.params : context.params;

    const existing = await getKeywordGroupById(id);
    if (!existing) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }

    const isOwner = existing.ownerId === userId || existing.ownerId == null;
    const isAdmin = isAdminEmail(email);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "이 그룹을 수정할 권한이 없습니다." }, { status: 403 });
    }

    const keywordList = await ensureKeywordsForWords(data.keywords);

    const group = await updateKeywordGroup({
      id,
      name: data.name,
      description: data.description,
      timezone: data.timezone,
      sendTime: data.sendTime,
      days: data.days,
      status: data.status,
      keywordIds: keywordList.map((kw) => kw.id),
      recipients: data.recipients,
    });
    return NextResponse.json({ data: group });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "그룹 수정 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}
