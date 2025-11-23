import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AppShell } from "@/components/app-shell";
import { authOptions, isAdminEmail } from "@/server/auth";
import { listUsers } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  const users = await listUsers();

  return (
    <AppShell title="회원 관리" description="가입된 사용자 계정과 권한을 확인할 수 있습니다.">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">사용자 목록</h2>
          <p className="text-sm text-slate-500">Google OAuth로 가입한 회원 정보가 최신 순으로 정렬됩니다.</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">이름</th>
                  <th className="px-4 py-2">이메일</th>
                  <th className="px-4 py-2">역할</th>
                  <th className="px-4 py-2">가입일</th>
                  <th className="px-4 py-2">최근 로그인</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                      아직 가입한 사용자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{user.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            user.role === "admin"
                              ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600"
                              : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                          }
                        >
                          {user.role === "admin" ? "관리자" : "일반"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{user.createdAt ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{user.lastLoginAt ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
