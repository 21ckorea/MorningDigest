import { AppShell } from "@/components/app-shell";
import { HistoryView } from "@/components/history-view";
import { authOptions } from "@/server/auth";
import { listDeliveryLogsForUser } from "@/server/store";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!session || !email || !userId) {
    redirect("/login");
  }

  const logs = await listDeliveryLogsForUser(userId, 50);

  return (
    <AppShell
      title="발송 이력"
      description="내 그룹에서 발송된 이메일 이력을 확인할 수 있습니다."
    >
      <HistoryView logs={logs} />
    </AppShell>
  );
}
