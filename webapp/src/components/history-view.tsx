"use client";

import Link from "next/link";
import type { DeliveryLog } from "@/types";
import { useMemo, useState } from "react";

interface HistoryViewProps {
  logs: DeliveryLog[];
}

export function HistoryView({ logs }: HistoryViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const groupOptions = useMemo(() => {
    const names = Array.from(new Set(logs.map((log) => log.groupName)));
    return names.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let next = logs;
    if (selectedGroup !== "all") {
      next = next.filter((log) => log.groupName === selectedGroup);
    }
    if (statusFilter === "sent") {
      next = next.filter((log) => log.status === "sent");
    } else if (statusFilter === "failed") {
      next = next.filter((log) => log.status !== "sent");
    }
    if (dateFilter !== "all") {
      const now = Date.now();
      const thresholdMs = dateFilter === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const minTime = now - thresholdMs;
      next = next.filter((log) => {
        const time = new Date(log.sentAt).getTime();
        if (Number.isNaN(time)) return false;
        return time >= minTime;
      });
    }
    return next;
  }, [logs, selectedGroup, statusFilter, dateFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  const pagedLogs = useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, totalPages]);

  const selectedLog = useMemo(
    () => filteredLogs.find((log) => log.id === selectedLogId) ?? null,
    [filteredLogs, selectedLogId]
  );

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">최근 발송 이력</h2>
          <p className="text-sm text-slate-500">최대 50건까지 최근 발송 내역이 표시됩니다.</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {groupOptions.length > 0 && (
            <div className="space-y-1 text-sm">
              <label htmlFor="history-group-filter" className="text-xs font-medium text-slate-500">
                그룹 필터
              </label>
              <select
                id="history-group-filter"
                className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
              >
                <option value="all">전체 그룹</option>
                {groupOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1 text-sm">
            <label htmlFor="history-status-filter" className="text-xs font-medium text-slate-500">
              상태 필터
            </label>
            <select
              id="history-status-filter"
              className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "sent" | "failed")}
            >
              <option value="all">전체</option>
              <option value="sent">성공</option>
              <option value="failed">실패</option>
            </select>
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="history-date-filter" className="text-xs font-medium text-slate-500">
              기간 필터
            </label>
            <select
              id="history-date-filter"
              className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as "all" | "7d" | "30d")}
            >
              <option value="all">전체</option>
              <option value="7d">최근 7일</option>
              <option value="30d">최근 30일</option>
            </select>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="text-sm text-slate-500">조건에 해당하는 발송 이력이 없습니다.</p>
      ) : (
        <>
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
                {pagedLogs.map((log) => {
                  const isSelected = log.id === selectedLogId;
                  return (
                    <tr
                      key={log.id}
                      className={
                        isSelected
                          ? "cursor-pointer bg-slate-50"
                          : "cursor-pointer hover:bg-slate-50"
                      }
                      onClick={() => setSelectedLogId(isSelected ? null : log.id)}
                    >
                      <td className="py-2 text-slate-500">{log.sentAt}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <div>
              총 {filteredLogs.length}건 중 {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredLogs.length)}건 표시
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-2 py-0.5 disabled:opacity-40"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
              >
                이전
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-2 py-0.5 disabled:opacity-40"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
              >
                다음
              </button>
            </div>
          </div>
          {selectedLog && (
            <div className="mt-6 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">상세 발송 내역</div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/history/preview/${selectedLog.issueId}`}
                    target="_blank"
                    className="text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    원문 이메일 보기
                  </Link>
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-700"
                    onClick={() => setSelectedLogId(null)}
                  >
                    닫기
                  </button>
                </div>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">시간</dt>
                  <dd className="text-slate-900">{selectedLog.sentAt}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">그룹</dt>
                  <dd className="text-slate-900">{selectedLog.groupName}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">제목</dt>
                  <dd className="text-slate-900">{selectedLog.subject}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">수신자</dt>
                  <dd className="text-slate-900">{selectedLog.recipient}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">상태</dt>
                  <dd className="text-slate-900">{selectedLog.status === "sent" ? "성공" : "실패"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">프로바이더</dt>
                  <dd className="text-slate-900">{selectedLog.provider}</dd>
                </div>
                {selectedLog.providerMessageId && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500">프로바이더 메시지 ID</dt>
                    <dd className="break-all text-slate-900">{selectedLog.providerMessageId}</dd>
                  </div>
                )}
                {selectedLog.error && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500">에러 메시지</dt>
                    <dd className="whitespace-pre-wrap text-slate-900">{selectedLog.error}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </>
      )}
    </section>
  );
}
