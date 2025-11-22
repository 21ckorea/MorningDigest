import { Bell, Globe2, Mail, Smartphone } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getNotificationSetting, listDeliverySettings } from "@/server/store";

import { updateDeliverySettingAction, updateNotificationSettingAction } from "./actions";

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
  const [settings, notificationSetting] = await Promise.all([
    listDeliverySettings(),
    getNotificationSetting(),
  ]);

  return (
    <AppShell
      title="발송 & 알림 설정"
      description="무료 티어 한도 내에서 타임존 · 템플릿 · 채널을 조정하세요."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">그룹별 발송 설정</h2>
              <p className="text-sm text-slate-500">
                무료 Cron · Queue 조합으로 운영 중입니다. 잦은 수정 시에도 별도 요금이 청구되지 않습니다.
              </p>
            </div>
          </div>
          {settings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              아직 등록된 키워드 그룹이 없습니다. 그룹을 생성하면 발송 설정을 여기서 바로 관리할 수 있습니다.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {settings.map((setting) => {
                const channels = setting.channels ?? ["email"];
                return (
                  <article key={setting.id} className="grid gap-4 py-4 first:pt-0 last:pb-0 lg:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">그룹</p>
                      <h3 className="text-lg font-semibold text-slate-900">{setting.groupName}</h3>
                      <p className="text-sm text-slate-500">
                        요약 길이 · 템플릿: {setting.summaryLength} · {setting.template}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-slate-400" />
                        {setting.timezone}
                      </p>
                      <p className="mt-2 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {setting.sendTime} ({setting.days.join(", ")})
                      </p>
                    </div>
                    <form action={updateDeliverySettingAction} className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                      <input type="hidden" name="groupId" value={setting.id} />
                      <div>
                        <label className="text-xs uppercase tracking-wide text-slate-500">요약 길이</label>
                        <select
                          name="summaryLength"
                          defaultValue={setting.summaryLength}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                          {summaryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wide text-slate-500">템플릿</label>
                        <select
                          name="template"
                          defaultValue={setting.template}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                          {templateOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">채널</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {channelOptions.map((channel) => (
                            <label key={channel.value} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                name="channels"
                                value={channel.value}
                                defaultChecked={channels.includes(channel.value)}
                                className="h-3 w-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              {channel.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-full bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                      >
                        변경 저장
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>

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
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">무료 플랜 한도</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>이메일 발송 3,000건/월 (Resend Free)</li>
              <li>Upstash Queue 10k 요청/일</li>
              <li>Supabase DB 500MB 저장</li>
            </ul>
          </div>
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
