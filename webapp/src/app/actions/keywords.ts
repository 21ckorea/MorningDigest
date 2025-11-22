'use server';

import { z } from 'zod';

import {
  createKeyword,
  createKeywordGroup,
  getKeywordsByIds,
} from '@/server/store';
import type { Keyword, KeywordGroup } from '@/types';

const keywordInputSchema = z.object({
  word: z.string().min(1, '키워드를 입력하세요').max(80),
  priority: z.enum(['high', 'medium', 'low']),
});

const keywordGroupInputSchema = z.object({
  name: z.string().min(1, '그룹명을 입력하세요').max(80),
  description: z.string().min(1, '그룹 설명을 입력하세요').max(200),
  timezone: z.string().min(1, '타임존을 선택하세요'),
  sendTime: z.string().min(1, '발송 시간을 지정하세요'),
  days: z.array(z.string()).min(1, '최소 1개 요일을 선택하세요'),
  keywordIds: z.array(z.string()).min(1, '최소 1개 키워드를 선택하세요'),
});

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createKeywordAction(
  input: z.infer<typeof keywordInputSchema>
): Promise<ActionResult<Keyword>> {
  const parsed = keywordInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '유효성 검사 오류',
    };
  }

  try {
    const keyword = await createKeyword(parsed.data);
    return { success: true, data: keyword };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '키워드 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function createKeywordGroupAction(
  input: z.infer<typeof keywordGroupInputSchema>
): Promise<ActionResult<KeywordGroup>> {
  const parsed = keywordGroupInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '유효성 검사 오류',
    };
  }

  try {
    const keywordList = await getKeywordsByIds(parsed.data.keywordIds);
    if (keywordList.length === 0) {
      return { success: false, error: '선택된 키워드를 찾을 수 없습니다.' };
    }

    const group = await createKeywordGroup({
      name: parsed.data.name,
      description: parsed.data.description,
      timezone: parsed.data.timezone,
      sendTime: parsed.data.sendTime,
      days: parsed.data.days,
      keywords: keywordList,
    });

    return { success: true, data: group };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '그룹 생성 중 오류가 발생했습니다.',
    };
  }
}
