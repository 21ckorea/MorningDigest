import type {
  ActivityLog,
  DeliverySetting,
  DigestIssue,
  Keyword,
  KeywordGroup,
} from "@/types";

export const keywords: Keyword[] = [
  {
    id: "kw-1",
    word: "AI 반도체",
    priority: "high",
    createdAt: "2025-10-12",
    volume: "2.1k",
  },
  {
    id: "kw-2",
    word: "친환경 소비",
    priority: "medium",
    createdAt: "2025-09-18",
    volume: "980",
  },
  {
    id: "kw-3",
    word: "모빌리티",
    priority: "low",
    createdAt: "2025-08-02",
    volume: "640",
  },
];

export const keywordGroups: KeywordGroup[] = [
  {
    id: "kg-1",
    name: "AI 산업",
    description: "반도체·대규모 모델·투자 이슈",
    timezone: "Asia/Seoul",
    sendTime: "07:00",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    status: "active",
    nextDelivery: "오늘 07:00",
    keywords,
  },
  {
    id: "kg-2",
    name: "리테일",
    description: "소비재·D2C 트렌드",
    timezone: "Asia/Seoul",
    sendTime: "07:30",
    days: ["Mon", "Wed", "Fri"],
    status: "paused",
    nextDelivery: "내일 07:30",
    keywords: keywords.slice(1),
  },
];

export const digestIssues: DigestIssue[] = [
  {
    id: "issue-1",
    groupId: "kg-1",
    groupName: "AI 산업",
    date: "2025-11-22",
    subject: "AI 반도체 공급망, 북미 투자 확대",
    highlights: [
      "TSMC 신규 파운드리 투자 계획",
      "삼성, B2B 전용 AI 가속기 공개",
    ],
    openRate: 62,
    status: "sent",
    articleCount: 12,
    generatedAt: "06:35",
  },
  {
    id: "issue-2",
    groupId: "kg-2",
    groupName: "리테일",
    date: "2025-11-21",
    subject: "블랙프라이데이 직후 재고조정 관찰",
    highlights: ["Amazon, 재고 턴오버 개선", "쿠팡 PB 매출 18% 성장"],
    openRate: 55,
    status: "sent",
    articleCount: 9,
    generatedAt: "06:40",
  },
  {
    id: "issue-3",
    groupId: "kg-1",
    groupName: "AI 산업",
    date: "2025-11-21",
    subject: "GPU VM 비용 하락과 스타트업 전환",
    highlights: ["MSA GPU 비용 18% 감소", "VC, AI Agent 투자 확대"],
    openRate: 68,
    status: "sent",
    articleCount: 11,
    generatedAt: "06:34",
  },
];

export const deliverySettings: DeliverySetting[] = [
  {
    id: "ds-1",
    groupName: "AI 산업",
    timezone: "Asia/Seoul",
    sendTime: "07:00",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    summaryLength: "standard",
    template: "insight",
    channels: ["email"],
  },
  {
    id: "ds-2",
    groupName: "리테일",
    timezone: "America/Los_Angeles",
    sendTime: "06:30",
    days: ["Tue", "Thu"],
    summaryLength: "short",
    template: "compact",
    channels: ["email", "slack"],
  },
];

export const activityLogs: ActivityLog[] = [
  {
    id: "log-1",
    type: "success",
    message: "AI 산업 그룹 메일 2,431명에게 발송 완료",
    timestamp: "오늘 · 07:01",
  },
  {
    id: "log-2",
    type: "info",
    message: "리테일 그룹 발송이 내일 일정으로 예약됨",
    timestamp: "오늘 · 06:55",
  },
  {
    id: "log-3",
    type: "warning",
    message: "키워드 '친환경 소비' 연관 기사 수 급감",
    timestamp: "어제 · 18:23",
  },
];
