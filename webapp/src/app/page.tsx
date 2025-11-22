import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">MorningDigest</p>
        <h1 className="text-3xl font-bold text-slate-900">키워드 기반 모닝 다이제스트</h1>
        <p className="text-base text-slate-600">
          실험용 프로젝트입니다. 아래 버튼을 눌러 대시보드로 이동해 키워드와 발송 그룹을 관리하세요.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow"
      >
        대시보드 바로가기
      </Link>
    </main>
  );
}
