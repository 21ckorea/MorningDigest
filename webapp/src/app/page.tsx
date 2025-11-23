import Link from "next/link";

const highlights = [
  {
    title: "맞춤 키워드 큐레이션",
    description: "사용자별 그룹을 만들고 중요한 산업·시장 키워드를 묶어 효율적으로 모니터링합니다.",
  },
  {
    title: "자동 요약 메일",
    description: "매일 아침 Asia/Seoul 기준으로 스케줄링된 요약본을 이메일로 받아볼 수 있습니다.",
  },
  {
    title: "실시간 대시보드",
    description: "최근 발송 로그와 성공률을 확인하며, 실패한 발송도 즉시 디버깅할 수 있습니다.",
  },
];

const steps = [
  {
    label: "Step 1",
    title: "Google 로그인",
    description: "1분 만에 가입하고 관리자라면 회원 목록까지 확인하세요.",
  },
  {
    label: "Step 2",
    title: "키워드 그룹 생성",
    description: "우선순위 키워드를 묶고 타임존·발송 요일을 설정합니다.",
  },
  {
    label: "Step 3",
    title: "자동 발송 & 모니터링",
    description: "Vercel Cron + Resend로 발송하고, 대시보드에서 성과를 추적하세요.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-24 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            MORNINGDIGEST · BETA
          </span>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
            키워드 기반 모닝 다이제스트로
            <br />
            아침 뉴스 루틴을 자동화하세요
          </h1>
          <p className="text-lg text-slate-600">
            관심 산업·프로젝트 키워드를 등록하면 새벽마다 주요 기사, 요약 포인트, 발송 로그까지 한 번에 확인할 수 있습니다.
            수동 큐레이션 대신 자동화된 콘텐츠 파이프라인을 경험해 보세요.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
            >
              지금 시작하기
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:border-slate-400"
            >
              데모 대시보드 보기
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate-500">
            <div>
              <p className="text-2xl font-bold text-slate-900">2,431+</p>
              <p>구독자가 매일 뉴스 요약 수신</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">5분</p>
              <p>설정부터 첫 발송까지</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">100%</p>
              <p>최근 발송 성공률</p>
            </div>
          </div>
        </div>
        <div className="flex-1 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-indigo-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">한눈에 보는 워크플로</p>
          <ul className="mt-4 space-y-5">
            {steps.map((step) => (
              <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-sm font-semibold text-indigo-600">{step.label}</span>
                <div>
                  <p className="text-base font-semibold text-slate-900">{step.title}</p>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">"매일 아침 필요한 기사만 골라 전달받아 팀 브리핑 시간이 절반으로 줄었습니다."</p>
            <p className="mt-2 text-xs text-slate-500">— Growth 팀 리더, 가상 고객 후기</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Features</p>
        <h2 className="mt-4 text-center text-3xl font-bold text-slate-900">사용자는 이렇게 활용합니다</h2>
        <p className="mt-2 text-center text-slate-600">
          키워드 큐레이션부터 이메일 발송, 로그 모니터링까지 한 곳에서 완성해 보세요.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 px-6 py-16 text-center text-white">
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">Onboarding CTA</p>
          <h2 className="text-3xl font-bold">지금 바로 키워드 기반 뉴스 루틴을 시작해 보세요</h2>
          <p className="text-base text-white/80">
            Google 로그인 후 키워드를 등록하면, Vercel Cron이 매일 새벽 자동으로 요약본을 생성하고 Resend가 안전하게 발송합니다.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-900"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/50 px-6 py-3 text-base font-semibold text-white"
            >
              제품 투어 보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
