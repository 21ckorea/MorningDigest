import { AppShell } from "@/components/app-shell";
import { KeywordManager } from "@/components/keyword-manager";
import { authOptions, isAdminEmail } from "@/server/auth";
import { listKeywordGroups, listKeywordGroupsForUser, listKeywords } from "@/server/store";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function KeywordsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!session || !email || !userId) {
    redirect("/login");
  }

  const isAdmin = isAdminEmail(email);

  const [keywords, groups] = await Promise.all([
    listKeywords(),
    isAdmin ? listKeywordGroups() : listKeywordGroupsForUser(userId),
  ]);

  return (
    <AppShell
      title="키워드 & 그룹 관리"
      description="그룹별 발송 조건을 조정하고 우선순위를 빠르게 확인하세요."
    >
      <KeywordManager initialKeywords={keywords} initialGroups={groups} />
    </AppShell>
  );
}
