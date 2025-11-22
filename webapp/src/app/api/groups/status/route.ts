import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { setKeywordGroupStatus } from "@/server/store";

const schema = z.object({
  id: z.string(),
  status: z.enum(["active", "paused"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const group = await setKeywordGroupStatus(data);
    return NextResponse.json({ data: group });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "그룹 상태 변경 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}
