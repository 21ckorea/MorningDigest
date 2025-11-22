"use client";

import { useMemo, useState } from "react";

type DispatchRecipient = {
  recipient: string;
  status: string;
  providerLabel?: string;
  messageId?: string;
  error?: string;
};

type DispatchEntry = {
  issueId: string;
  recipients: DispatchRecipient[];
};

type ApiResponse = {
  ok: boolean;
  stats?: {
    groupsProcessed: number;
    successes: number;
    failures: number;
  };
  dispatch?: DispatchEntry[];
  error?: string;
};

export function DigestRunPanel() {
  const [sendEmails, setSendEmails] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("수동 실행으로 새 다이제스트를 생성할 수 있습니다.");
  const [result, setResult] = useState<ApiResponse | null>(null);

  const recipientsArray = useMemo(
    () =>
      recipientInput
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean),
    [recipientInput]
  );

  const handleRun = async () => {
    setStatus("running");
    setMessage("다이제스트 생성 중...");
    setResult(null);

    try {
      const payload: Record<string, unknown> = {};
      if (sendEmails) {
        payload.sendEmails = true;
        if (recipientsArray.length > 0) {
          payload.recipients = recipientsArray;
        }
      }

      const response = await fetch("/api/digests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "API 호출에 실패했습니다.");
      }

      setStatus("success");
      setMessage(
        `그룹 ${data.stats?.groupsProcessed ?? 0}개 처리 · 성공 ${data.stats?.successes ?? 0}건 · 실패 ${
          data.stats?.failures ?? 0
        }건`
      );
      setResult(data);
    } catch (error) {
      console.error("[DigestRun]", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">수동 다이제스트 실행</p>
          <p className="text-sm text-slate-500">테스트 발송 여부를 선택하고 즉시 실행할 수 있습니다.</p>
        </div>
        <button
          onClick={handleRun}
          disabled={status === "running"}
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {status === "running" ? "실행 중..." : "즉시 실행"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={sendEmails}
            onChange={(event) => setSendEmails(event.target.checked)}
          />
          생성 후 테스트 이메일 발송
        </label>
        <input
          type="text"
          placeholder="comma 로 구분된 수신자 입력 (옵션)"
          value={recipientInput}
          onChange={(event) => setRecipientInput(event.target.value)}
          disabled={!sendEmails}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50"
        />
      </div>

      <div
        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          status === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : status === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        {message}
      </div>

      {result?.dispatch && result.dispatch.length > 0 ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-semibold text-slate-800">발송 결과</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">이슈 ID</th>
                  <th className="px-4 py-2">수신자</th>
                  <th className="px-4 py-2">상태</th>
                  <th className="px-4 py-2">프로바이더</th>
                  <th className="px-4 py-2">메시지 ID</th>
                  <th className="px-4 py-2">오류</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.dispatch.flatMap((entry) =>
                  entry.recipients.map((recipient) => (
                    <tr key={`${entry.issueId}-${recipient.recipient}`}>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{entry.issueId}</td>
                      <td className="px-4 py-2 text-slate-800">{recipient.recipient}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            recipient.status === "sent"
                              ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600"
                              : "rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600"
                          }
                        >
                          {recipient.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{recipient.providerLabel ?? "-"}</td>
                      <td className="px-4 py-2 text-slate-500">{recipient.messageId ?? "-"}</td>
                      <td className="px-4 py-2 text-rose-500">{recipient.error ?? ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
