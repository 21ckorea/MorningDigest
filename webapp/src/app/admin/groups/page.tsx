import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AppShell } from "@/components/app-shell";
import { authOptions, isAdminEmail } from "@/server/auth";
import { listKeywordGroups, listUsers } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;
  if (!isAdminEmail(email)) {
    redirect("/dashboard");
  }

  const [groups, users] = await Promise.all([listKeywordGroups(), listUsers()]);
  const userById = new Map(users.map((u) => [u.id, u] as const));

  return (
    <AppShell title="그룹 관리" description="모든 사용자의 키워드 그룹과 구성을 조회할 수 있습니다.">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">키워드 그룹 목록</h2>
          <p className="text-sm text-slate-500">
            그룹 소유자, 키워드, 수신자, 발송 스케줄 정보를 한눈에 볼 수 있습니다.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">소유자</th>
                  <th className="px-4 py-2">그룹 이름</th>
                  <th className="px-4 py-2">설명</th>
                  <th className="px-4 py-2">발송 시간</th>
                  <th className="px-4 py-2">요일</th>
                  <th className="px-4 py-2">키워드</th>
                  <th className="px-4 py-2">수신자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                      아직 생성된 키워드 그룹이 없습니다.
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => {
                    const owner = group.ownerId ? userById.get(group.ownerId) : undefined;
                    const ownerLabel = owner ? `${owner.name ?? owner.email} (${owner.email})` : "—";
                    const daysLabel = group.days.join(", ");
                    const keywordsLabel = group.keywords.map((k) => k.word).join(", ") || "—";
                    const recipientsLabel = group.recipients.join(", ") || "—";

                    return (
                      <tr key={group.id}>
                        <td className="px-4 py-3 text-slate-600">{ownerLabel}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{group.name}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={group.description}>
                          {group.description}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {group.timezone} {" "}
                          {group.sendTime}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{daysLabel}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={keywordsLabel}>
                          {keywordsLabel}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={recipientsLabel}>
                          {recipientsLabel}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
