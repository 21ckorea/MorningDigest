import { Activity, CheckCircle2, Sparkles, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DigestRunPanel } from "@/components/digest-run-panel";
import { listKeywordGroups, listRecentDeliveryLogs, listRecentDigestIssues, listUsers } from "@/server/store";

export default async function DashboardPage() {
  const [keywordGroups, digestIssues, deliveryLogs, users] = await Promise.all([
    listKeywordGroups(),
    listRecentDigestIssues(3),
    listRecentDeliveryLogs(20),
    listUsers(),
  ]);

  const pendingDigests = digestIssues.filter((issue) => issue.status !== "sent");
  const latestIssues = digestIssues;
  const failedLogs = deliveryLogs.filter((log) => log.status !== "sent");
  const successCount = deliveryLogs.length - failedLogs.length;
  const failureCount = failedLogs.length;
  const successRate = deliveryLogs.length === 0 ? null : Math.round((successCount / deliveryLogs.length) * 100);

  const formatKSTDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const formatKSTDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <AppShell
      title="모닝 다이제스트 개요"
      description="오늘 발송 현황과 주요 알림을 한눈에 확인하세요."
    >
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="회원 수"
          value={`${users.length.toLocaleString()}명`}
          helper="Google OAuth 가입 기준"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          title="오늘 예정 그룹"
          value={`${keywordGroups.length}개`}
          helper="타임존 자동 조정"
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          title="최근 성공률"
          value={successRate === null ? "—" : `${successRate}%`}
          helper={deliveryLogs.length === 0 ? "로그 없음" : `성공 ${successCount} · 실패 ${failureCount}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <DigestRunPanel />
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">최근 발송본</h2>
              <p className="text-sm text-slate-500">요약과 오픈율을 빠르게 확인하세요.</p>
            </div>
            <button className="text-sm font-medium text-slate-700">전체 보기</button>
          </div>
          <div className="divide-y divide-slate-100">
            {latestIssues.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">아직 생성된 다이제스트가 없습니다. 상단 메뉴에서 키워드 그룹을 추가해보세요.</p>
            ) : (
              latestIssues.map((issue) => (
                <article key={issue.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {issue.groupName}
                    </span>
                    <p className="text-sm text-slate-500">{formatKSTDate(issue.date)}</p>
                    <span
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600"
                    >
                      오픈율 {issue.openRate}%
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{issue.subject}</h3>
                  {issue.highlights.length > 0 ? (
                    <ul className="text-sm text-slate-600">
                      {issue.highlights.map((highlight) => (
                        <li key={highlight}>• {highlight}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">요약 정보가 제공되지 않았습니다.</p>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold">알림 & 로그</h2>
          </div>
          {failedLogs.length === 0 ? (
            <p className="text-sm text-slate-500">최근 20건 내 실패 로그가 없습니다. 모든 메일이 정상 발송됐어요.</p>
          ) : (
            <div className="space-y-3">
              {failedLogs.slice(0, 3).map((log) => (
                <article
                  key={log.id}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  <p className="text-xs uppercase tracking-wide">{formatKSTDateTime(log.sentAt)}</p>
                  <p className="mt-1 font-semibold">{log.groupName} 발송 실패</p>
                  <p className="text-xs text-current">{log.recipient} · {log.provider}</p>
                  <p className="mt-1 text-xs text-current">{log.error ?? "오류 메시지가 기록되지 않았습니다."}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold">최근 발송 로그</h2>
          </div>
          {deliveryLogs.length === 0 ? (
            <p className="text-sm text-slate-500">아직 기록된 발송 로그가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2">시간</th>
                    <th className="pb-2">그룹</th>
                    <th className="pb-2">제목</th>
                    <th className="pb-2">수신자</th>
                    <th className="pb-2">상태</th>
                    <th className="pb-2">프로바이더</th>
                    <th className="pb-2">메시지</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 text-slate-500">{formatKSTDateTime(log.sentAt)}</td>
                      <td className="py-2 font-medium text-slate-800">{log.groupName}</td>
                      <td className="py-2 text-slate-600">{log.subject}</td>
                      <td className="py-2 text-slate-500">{log.recipient}</td>
                      <td className="py-2">
                        <span
                          className={
                            log.status === "sent"
                              ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600"
                              : "rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600"
                          }
                        >
                          {log.status === "sent" ? "성공" : "실패"}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">{log.provider}</td>
                      <td className="py-2 text-xs text-slate-500">
                        {log.status === "sent" ? "전송 완료" : log.error ?? "오류 정보 없음"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, helper, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-slate-400">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  );
}
