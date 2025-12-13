"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Clock3,
  Globe,
  Pause,
  PenSquare,
  Play,
  Plus,
  Tag,
  X,
} from "lucide-react";

import { keywords as defaultKeywords, keywordGroups as defaultGroups } from "@/data/mockData";
import type { Keyword, KeywordGroup } from "@/types";

import { Modal } from "./modal";

const priorityColors: Record<Keyword["priority"], string> = {
  high: "bg-rose-50 text-rose-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-emerald-50 text-emerald-600",
};

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timezoneOptions = ["Asia/Seoul", "America/Los_Angeles", "UTC"];

type GroupFormState = {
  name: string;
  description: string;
  timezone: string;
  sendTime: string;
  days: string[];
  // 쉼표로 구분된 키워드 입력값 (예: "한국 증시, AI, 반도체")
  keywordText: string;
  recipients: string[];
};

type ToastType = "success" | "error";
interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface KeywordManagerProps {
  initialKeywords?: Keyword[];
  initialGroups?: KeywordGroup[];
  isAdmin?: boolean;
}

export function KeywordManager({
  initialKeywords = defaultKeywords,
  initialGroups = defaultGroups,
  isAdmin = false,
}: KeywordManagerProps) {
  const [keywordList, setKeywordList] = useState<Keyword[]>(initialKeywords);
  const [groupList, setGroupList] = useState<KeywordGroup[]>(initialGroups);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isKeywordEditModalOpen, setIsKeywordEditModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupEditModalOpen, setIsGroupEditModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [keywordForm, setKeywordForm] = useState({ word: "", priority: "medium" as Keyword["priority"] });
  const [keywordEditForm, setKeywordEditForm] = useState<{ id: string; word: string; priority: Keyword["priority"] } | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [keywordEditError, setKeywordEditError] = useState<string | null>(null);
  const [isKeywordSubmitting, setIsKeywordSubmitting] = useState(false);
  const [isKeywordUpdating, setIsKeywordUpdating] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const createEmptyGroupForm = (): GroupFormState => ({
    name: "",
    description: "",
    timezone: "Asia/Seoul",
    sendTime: "07:00",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    keywordText: "",
    recipients: [] as string[],
  });
  const [groupForm, setGroupForm] = useState<GroupFormState>(createEmptyGroupForm);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupEditError, setGroupEditError] = useState<string | null>(null);
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [isGroupUpdating, setIsGroupUpdating] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientEditInput, setRecipientEditInput] = useState("");

  function resetGroupForm() {
    setGroupForm(createEmptyGroupForm());
    setRecipientInput("");
  }

  function parseRecipients(value: string): string[] {
    return value
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  }

  function parseKeywords(value: string): string[] {
    return value
      .split(",")
      .map((word) => word.trim())
      .filter((word) => word.length > 0);
  }

  const activeGroupCount = useMemo(
    () => groupList.filter((group) => group.status === "active").length,
    [groupList]
  );

  const uniqueKeywordCount = useMemo(() => {
    const words = keywordList.map((kw) => kw.word);
    return new Set(words).size;
  }, [keywordList]);

  function pushToast(type: ToastType, message: string) {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }

  async function handleGroupStatusToggle(group: KeywordGroup) {
    const nextStatus = group.status === "active" ? "paused" : "active";
    try {
      const response = await fetch(`/api/groups/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: group.id, status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({ error: "그룹 상태 변경 중 오류" }));
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "그룹 상태 변경 중 오류가 발생했습니다.");
      }
      const updated = payload.data as KeywordGroup;
      setGroupList((prev) => prev.map((grp) => (grp.id === updated.id ? updated : grp)));
      pushToast("success", `그룹이 ${nextStatus === "active" ? "활성" : "일시중지"} 상태가 되었습니다.`);
    } catch (error) {
      console.error(error);
      pushToast("error", error instanceof Error ? error.message : "상태 변경 실패");
    }
  }

  async function handleGroupDelete(group: KeywordGroup) {
    const confirmed = window.confirm(`'${group.name}' 그룹을 삭제할까요?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("그룹 삭제 중 오류가 발생했습니다.");
      }
      setGroupList((prev) => prev.filter((item) => item.id !== group.id));
      pushToast("success", "그룹이 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      pushToast("error", error instanceof Error ? error.message : "그룹 삭제 실패");
    }
  }

  function openKeywordEditModal(keyword: Keyword) {
    setKeywordEditForm({ id: keyword.id, word: keyword.word, priority: keyword.priority });
    setKeywordEditError(null);
    setIsKeywordEditModalOpen(true);
  }

  async function handleKeywordUpdate() {
    if (!keywordEditForm) return;
    if (!keywordEditForm.word.trim()) {
      setKeywordEditError("키워드명을 입력하세요.");
      return;
    }
    if (keywordList.some((kw) => kw.word === keywordEditForm.word.trim() && kw.id !== keywordEditForm.id)) {
      setKeywordEditError("이미 존재하는 키워드입니다.");
      return;
    }

    setKeywordEditError(null);
    setIsKeywordUpdating(true);
    try {
      const response = await fetch(`/api/keywords/${keywordEditForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: keywordEditForm.word.trim(),
          priority: keywordEditForm.priority,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ error: "키워드 수정 중 오류가 발생했습니다." }));

      if (!response.ok || !payload?.data) {
        const message = payload?.error ?? "키워드 수정 중 오류가 발생했습니다.";
        setKeywordEditError(message);
        pushToast("error", message);
        return;
      }

      const updated = payload.data as Keyword;
      setKeywordList((prev) => prev.map((kw) => (kw.id === updated.id ? updated : kw)));
      setIsKeywordEditModalOpen(false);
      setKeywordEditForm(null);
      pushToast("success", "키워드가 수정되었습니다.");
    } catch (error) {
      console.error(error);
      const message = "네트워크 오류가 발생했습니다.";
      setKeywordEditError(message);
      pushToast("error", message);
    } finally {
      setIsKeywordUpdating(false);
    }
  }

  async function handleKeywordDelete(keyword: Keyword) {
    const confirmed = window.confirm(`'${keyword.word}' 키워드를 삭제할까요?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/keywords/${keyword.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("삭제 요청이 실패했습니다.");
      }
      setKeywordList((prev) => prev.filter((kw) => kw.id !== keyword.id));
      pushToast("success", "키워드가 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      pushToast("error", "키워드 삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleKeywordSubmit() {
    if (!keywordForm.word.trim()) {
      setKeywordError("키워드명을 입력하세요.");
      return;
    }
    if (keywordList.some((kw) => kw.word === keywordForm.word.trim())) {
      setKeywordError("이미 존재하는 키워드입니다.");
      return;
    }

    setKeywordError(null);
    setIsKeywordSubmitting(true);
    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: keywordForm.word.trim(),
          priority: keywordForm.priority,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ error: "키워드 등록 중 오류가 발생했습니다." }));

      if (!response.ok || !payload?.data) {
        const message = payload?.error ?? "키워드 등록 중 오류가 발생했습니다.";
        setKeywordError(message);
        pushToast("error", message);
        return;
      }

      const newKeyword = payload.data as Keyword;
      setKeywordList((prev) => [newKeyword, ...prev]);
      setKeywordForm({ word: "", priority: "medium" });
      setIsKeywordModalOpen(false);
      pushToast("success", "키워드가 추가되었습니다.");
    } catch (error) {
      console.error(error);
      const message = "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setKeywordError(message);
      pushToast("error", message);
    } finally {
      setIsKeywordSubmitting(false);
    }
  }

  function toggleGroupDay(day: string) {
    setGroupForm((prev) => {
      const exists = prev.days.includes(day);
      return {
        ...prev,
        days: exists ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(
          (a, b) => dayOptions.indexOf(a) - dayOptions.indexOf(b)
        ),
      };
    });
  }

  async function handleGroupSubmit() {
    if (!groupForm.name.trim()) {
      setGroupError("그룹명을 입력하세요.");
      return;
    }
    if (!groupForm.description.trim()) {
      setGroupError("그룹 설명을 입력하세요.");
      return;
    }
    const keywordWords = parseKeywords(groupForm.keywordText);
    if (keywordWords.length === 0) {
      setGroupError("최소 1개의 키워드를 입력하세요.");
      return;
    }

    const recipients = parseRecipients(recipientInput);
    if (recipients.length === 0) {
      setGroupError("최소 1개의 수신 이메일을 입력하세요.");
      return;
    }

    setGroupError(null);
    setIsGroupSubmitting(true);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim(),
          timezone: groupForm.timezone,
          sendTime: groupForm.sendTime,
          days: groupForm.days,
          keywords: keywordWords,
          recipients,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ error: "그룹 생성 중 오류가 발생했습니다." }));

      if (!response.ok || !payload?.data) {
        const message = payload?.error ?? "그룹 생성 중 오류가 발생했습니다.";
        setGroupError(message);
        pushToast("error", message);
        return;
      }

      const newGroup = payload.data as KeywordGroup;
      setGroupList((prev) => [newGroup, ...prev]);
      resetGroupForm();
      setRecipientInput("");
      setIsGroupModalOpen(false);
      pushToast("success", "그룹이 생성되었습니다.");
    } catch (error) {
      console.error(error);
      const message = "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setGroupError(message);
      pushToast("error", message);
    } finally {
      setIsGroupSubmitting(false);
    }
  }

  function openGroupEditModal(group: KeywordGroup) {
    setEditingGroupId(group.id);
    setGroupForm({
      name: group.name,
      description: group.description,
      timezone: group.timezone,
      sendTime: group.sendTime,
      days: group.days,
      keywordText: group.keywords.map((kw) => kw.word).join(", "),
      recipients: group.recipients,
    });
    setRecipientEditInput(group.recipients.join(", "));
    setGroupEditError(null);
    setIsGroupEditModalOpen(true);
  }

  async function handleGroupUpdate() {
    if (!editingGroupId) return;
    if (!groupForm.name.trim()) {
      setGroupEditError("그룹명을 입력하세요.");
      return;
    }
    if (!groupForm.description.trim()) {
      setGroupEditError("그룹 설명을 입력하세요.");
      return;
    }
    const keywordWords = parseKeywords(groupForm.keywordText);
    if (keywordWords.length === 0) {
      setGroupEditError("최소 1개의 키워드를 입력하세요.");
      return;
    }

    const targetGroup = groupList.find((group) => group.id === editingGroupId);
    if (!targetGroup) {
      setGroupEditError("그룹 정보를 찾을 수 없습니다.");
      return;
    }

    setGroupEditError(null);
    setIsGroupUpdating(true);
    try {
      const response = await fetch(`/api/groups/${editingGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim(),
          timezone: groupForm.timezone,
          sendTime: groupForm.sendTime,
          days: groupForm.days,
          keywords: keywordWords,
          status: targetGroup.status,
          recipients: parseRecipients(recipientEditInput),
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ error: "그룹 수정 중 오류가 발생했습니다." }));

      if (!response.ok || !payload?.data) {
        const message = payload?.error ?? "그룹 수정 중 오류가 발생했습니다.";
        setGroupEditError(message);
        pushToast("error", message);
        return;
      }

      const updated = payload.data as KeywordGroup;
      setGroupList((prev) => prev.map((group) => (group.id === updated.id ? updated : group)));
      setIsGroupEditModalOpen(false);
      setEditingGroupId(null);
      resetGroupForm();
      setRecipientEditInput("");
      pushToast("success", "그룹이 수정되었습니다.");
    } catch (error) {
      console.error(error);
      const message = "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setGroupEditError(message);
      pushToast("error", message);
    } finally {
      setIsGroupUpdating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">그룹 관리</h2>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? "관리자 계정입니다. 전체 사용자의 그룹 구성을 확인할 수 있습니다."
              : "내 계정의 그룹 발송 조건을 관리할 수 있습니다."}
          </p>
          {isAdmin ? (
            <p className="mt-1 text-xs text-slate-400">
              자세한 전체 그룹 구성은 상단 메뉴의 관리 영역(/admin/groups)에서 확인할 수 있습니다.
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={() => setIsGroupModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> 그룹 생성
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="등록 키워드 (전체)"
          value={`${uniqueKeywordCount}개`}
          helper="모든 사용자 기준 중복 제거"
        />
        <MetricCard label="활성 그룹" value={`${activeGroupCount}개`} helper="" />
        <MetricCard label="일 평균 요약" value="18건" helper="" />
        <MetricCard label="평균 발송 시간" value="07:12 KST" helper="" />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">키워드 그룹</h3>
            <p className="text-sm text-slate-500">그룹별 발송 시간과 키워드를 관리하세요.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock3 className="h-4 w-4" /> Asia/Seoul 기준 표시
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {groupList.map((group) => (
            <KeywordGroupCard
              key={group.id}
              group={group}
              onEdit={() => openGroupEditModal(group)}
              onToggleStatus={() => handleGroupStatusToggle(group)}
              onDelete={() => handleGroupDelete(group)}
            />
          ))}
          {groupList.length === 0 ? (
            <p className="text-sm text-slate-500">아직 생성된 그룹이 없습니다.</p>
          ) : null}
        </div>
      </section>

      

      <AddGroupModal
        open={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setGroupError(null);
          resetGroupForm();
        }}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        onSubmit={handleGroupSubmit}
        error={groupError}
        onToggleDay={toggleGroupDay}
        keywordText={groupForm.keywordText}
        onKeywordTextChange={(value) => setGroupForm((prev) => ({ ...prev, keywordText: value }))}
        recipientsValue={recipientInput}
        onRecipientsChange={setRecipientInput}
        loading={isGroupSubmitting}
      />

      <AddGroupModal
        open={isGroupEditModalOpen}
        onClose={() => {
          setIsGroupEditModalOpen(false);
          setGroupEditError(null);
          setEditingGroupId(null);
          resetGroupForm();
        }}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        onSubmit={handleGroupUpdate}
        error={groupEditError}
        onToggleDay={toggleGroupDay}
        keywordText={groupForm.keywordText}
        onKeywordTextChange={(value) => setGroupForm((prev) => ({ ...prev, keywordText: value }))}
        recipientsValue={recipientEditInput}
        onRecipientsChange={setRecipientEditInput}
        loading={isGroupUpdating}
        title="키워드 그룹 수정"
        description="발송 시간과 요약 키워드를 업데이트하세요."
        submitLabel="저장"
      />

      <div className="pointer-events-none fixed right-6 top-24 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  helper: string;
}

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  );
}

interface KeywordGroupCardProps {
  group: KeywordGroup;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

function KeywordGroupCard({ group, onToggleStatus, onDelete, onEdit }: KeywordGroupCardProps) {
  const Icon = group.status === "active" ? Play : Pause;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">{group.name}</p>
          <h4 className="text-xl font-semibold text-slate-900">{group.description}</h4>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
          {group.status === "active" ? "활성" : "일시중지"}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-slate-400" />
          발송 시간: {group.sendTime} ({group.days.join(", ")})
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" />
          타임존: {group.timezone}
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {group.keywords.map((kw) => (
          <span
            key={kw.id}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[kw.priority]}`}
          >
            {kw.word}
          </span>
        ))}
        {group.keywords.length === 0 ? (
          <span className="text-xs text-slate-500">연결된 키워드 없음</span>
        ) : null}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        {group.recipients.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {group.recipients.map((email) => (
              <span key={email} className="rounded-full border border-slate-200 px-3 py-1 text-slate-600">
                {email}
              </span>
            ))}
          </div>
        ) : (
          <span>연결된 이메일 없음</span>
        )}
      </div>
      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <p>다음 발송: {group.nextDelivery}</p>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            onClick={onEdit}
          >
            <PenSquare className="h-4 w-4" /> 편집
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            onClick={onToggleStatus}
          >
            <Icon className="h-4 w-4" />
            {group.status === "active" ? "일시중지" : "활성화"}
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500"
            onClick={onDelete}
          >
            <X className="h-4 w-4" /> 삭제
          </button>
        </div>
      </div>
    </article>
  );
}

interface AddKeywordModalProps {
  open: boolean;
  onClose: () => void;
  keywordForm: { word: string; priority: Keyword["priority"] };
  setKeywordForm: (form: { word: string; priority: Keyword["priority"] }) => void;
  onSubmit: () => void;
  error: string | null;
  loading?: boolean;
}

function AddKeywordModal({
  open,
  onClose,
  keywordForm,
  setKeywordForm,
  onSubmit,
  error,
  loading = false,
}: AddKeywordModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="키워드 추가"
      description="무료 키워드는 최대 50개까지 등록 가능합니다."
    >
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="keyword-word">
          키워드명
        </label>
        <input
          id="keyword-word"
          aria-label="키워드명"
          placeholder="예: 생성형 AI"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={keywordForm.word}
          onChange={(event) =>
            setKeywordForm({ ...keywordForm, word: event.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="keyword-priority">
          우선순위
        </label>
        <select
          id="keyword-priority"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={keywordForm.priority}
          onChange={(event) =>
            setKeywordForm({ ...keywordForm, priority: event.target.value as Keyword["priority"] })
          }
        >
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </select>
      </div>
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button className="rounded-full border border-slate-200 px-4 py-2 text-sm" onClick={onClose}>
          취소
        </button>
        <button
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "추가 중..." : "추가"}
        </button>
      </div>
    </Modal>
  );
}

interface AddGroupModalProps {
  open: boolean;
  onClose: () => void;
  groupForm: GroupFormState;
  setGroupForm: Dispatch<SetStateAction<GroupFormState>>;
  onSubmit: () => void;
  error: string | null;
  onToggleDay: (day: string) => void;
  keywordText: string;
  onKeywordTextChange: (value: string) => void;
  recipientsValue: string;
  onRecipientsChange: (value: string) => void;
  loading?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
}

function AddGroupModal({
  open,
  onClose,
  groupForm,
  setGroupForm,
  onSubmit,
  error,
  onToggleDay,
  keywordText,
  onKeywordTextChange,
  recipientsValue,
  onRecipientsChange,
  loading = false,
  title = "키워드 그룹 생성",
  description = "무료 티어에서도 그룹 수 제한 없이 사용할 수 있습니다.",
  submitLabel = "생성",
}: AddGroupModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="group-name">
            그룹명
          </label>
          <input
            id="group-name"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={groupForm.name}
            onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="group-timezone">
            타임존
          </label>
          <select
            id="group-timezone"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={groupForm.timezone}
            onChange={(event) => setGroupForm({ ...groupForm, timezone: event.target.value })}
          >
            {timezoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="group-desc">
            설명
          </label>
          <textarea
            id="group-desc"
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={groupForm.description}
            onChange={(event) =>
              setGroupForm({ ...groupForm, description: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="group-send-time">
            발송 시간
          </label>
          <input
            id="group-send-time"
            type="time"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={groupForm.sendTime}
            onChange={(event) => setGroupForm({ ...groupForm, sendTime: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">발송 요일</label>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((day) => (
              <button
                type="button"
                key={day}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  groupForm.days.includes(day)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600"
                }`}
                onClick={() => onToggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="group-keywords">
          포함할 키워드 (쉼표로 구분)
        </label>
        <textarea
          id="group-keywords"
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={keywordText}
          onChange={(event) => onKeywordTextChange(event.target.value)}
          placeholder="예: 한국 증시, AI, 반도체"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="group-recipients">
          수신 이메일 (쉼표로 구분)
        </label>
        <textarea
          id="group-recipients"
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={recipientsValue}
          onChange={(event) => onRecipientsChange(event.target.value)}
          placeholder="예: alice@example.com, bob@example.com"
        />
      </div>
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button className="rounded-full border border-slate-200 px-4 py-2 text-sm" onClick={onClose}>
          취소
        </button>
        <button
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? `${submitLabel} 중...` : submitLabel}
        </button>
      </div>
    </Modal>
  );
}
