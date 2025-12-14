import { AppShell } from "@/components/app-shell";
import { authOptions, isAdminEmail } from "@/server/auth";
import { getDigestIssueById, getDigestIssueForUser } from "@/server/store";
import { renderDigestEmail } from "@/server/mailer";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

interface PageProps {
  params: { issueId: string };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HistoryPreviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!session || !email || !userId) {
    redirect("/login");
  }

  const isAdmin = isAdminEmail(email);
  const issue = isAdmin
    ? await getDigestIssueById(params.issueId)
    : await getDigestIssueForUser(params.issueId, userId);

  if (!issue) {
    redirect("/history");
  }

  const { subject, html } = renderDigestEmail(issue);

  return (
    <AppShell
      title="원문 이메일 미리보기"
      description="실제 발송된 이메일 내용을 그대로 확인할 수 있습니다."
    >
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">{subject}</h2>
          <p className="text-sm text-slate-500">아래 영역은 실제 이메일 HTML을 그대로 렌더링한 미리보기입니다.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div
            className="min-h-[400px] w-full bg-slate-50"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>
    </AppShell>
  );
}
