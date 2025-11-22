import { AppShell } from "@/components/app-shell";
import { KeywordManager } from "@/components/keyword-manager";
import { listKeywordGroups, listKeywords } from "@/server/store";

export default async function KeywordsPage() {
  const [keywords, groups] = await Promise.all([listKeywords(), listKeywordGroups()]);

  return (
    <AppShell
      title="키워드 & 그룹 관리"
      description="그룹별 발송 조건을 조정하고 우선순위를 빠르게 확인하세요."
    >
      <KeywordManager initialKeywords={keywords} initialGroups={groups} />
    </AppShell>
  );
}
