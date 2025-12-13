import { Bell, Mail, Smartphone } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { authOptions } from "@/server/auth";
import { getNotificationSetting } from "@/server/store";

import { updateNotificationSettingAction } from "./actions";

const summaryOptions = [
  { value: "short", label: "짧게" },
  { value: "standard", label: "표준" },
  { value: "long", label: "길게" },
];

const templateOptions = [
  { value: "compact", label: "Compact" },
  { value: "insight", label: "Insight" },
  { value: "full", label: "Full" },
];

const channelOptions = [
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack" },
  { value: "sms", label: "SMS" },
];

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!session || !email || !userId) {
    redirect("/login");
  }

  const notificationSetting = await getNotificationSetting();

  return (
    <AppShell
      title="발송 & 알림 설정"
      description="무료 티어 한도 내에서 타임존 · 템플릿 · 채널을 조정하세요."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">알림 & 한도</h2>
            <p className="text-sm text-slate-500">
              무료 플랜 기준 제한치를 넘기기 전 Slack / Email 알림을 받습니다.
            </p>
          </div>
          <form action={updateNotificationSettingAction} className="space-y-3">
            <ToggleRow
              icon={<Bell className="h-4 w-4 text-amber-500" />}
              title="발송 실패 즉시 알림"
              helper="Queue 재시도 3회 후에도 실패하면 알림 전송"
              name="sendFailureAlert"
              defaultChecked={notificationSetting.sendFailureAlert}
            />
            <ToggleRow
              icon={<Smartphone className="h-4 w-4 text-emerald-500" />}
              title="SMS 백업 알림"
              helper="무료 플랜에서는 하루 3회까지만 제공"
              name="sendSmsBackup"
              defaultChecked={notificationSetting.sendSmsBackup}
            />
            <ToggleRow
              icon={<Mail className="h-4 w-4 text-slate-500" />}
              title="주간 요약 리포트"
              helper="구독자, 오픈율, 인기 키워드를 요약"
              name="sendWeeklyReport"
              defaultChecked={notificationSetting.sendWeeklyReport}
            />
            <button
              type="submit"
              className="w-full rounded-full bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              알림 설정 저장
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  helper: string;
  name: string;
  defaultChecked?: boolean;
}

function ToggleRow({ icon, title, helper, name, defaultChecked }: ToggleRowProps) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
        </div>
        <p className="text-xs text-slate-500">{helper}</p>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full border border-slate-200 bg-white transition peer-checked:border-emerald-200 peer-checked:bg-emerald-500" />
        <div className="pointer-events-none absolute left-1 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </div>
    </label>
  );
}
