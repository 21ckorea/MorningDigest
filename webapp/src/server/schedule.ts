const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_LABELS: Record<string, string> = {
  Sun: "일",
  Mon: "월",
  Tue: "화",
  Wed: "수",
  Thu: "목",
  Fri: "금",
  Sat: "토",
};

export const SEND_WINDOW_MINUTES = 5;

export interface ScheduleConfig {
  timezone: string;
  sendTime: string;
  days: string[];
}

export function parseSendTime(sendTime: string) {
  const [hourString, minuteString] = sendTime.split(":");
  const hour = Number(hourString ?? "0");
  const minute = Number(minuteString ?? "0");
  return hour * 60 + minute;
}

export function normalizeWeekday(label: string) {
  if (!label) return "";
  return label.slice(0, 3).replace(/^([a-z])(.*)$/i, (_, first: string, rest: string) => `${first.toUpperCase()}${rest.toLowerCase()}`);
}

export function getZonedScheduleMeta(timezone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = normalizeWeekday(get("weekday"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    weekday,
    weekdayIndex: DAY_ORDER.indexOf(weekday as (typeof DAY_ORDER)[number]),
    minutesSinceMidnight: hour * 60 + minute,
  };
}

export function isWithinSendWindow(config: ScheduleConfig, windowMinutes = SEND_WINDOW_MINUTES, referenceDate = new Date()) {
  const timezone = config.timezone || "Asia/Seoul";
  const meta = getZonedScheduleMeta(timezone, referenceDate);
  if (meta.weekdayIndex < 0) return false;
  const todayCode = meta.weekday;
  const normalizedDays = config.days.map(normalizeWeekday);
  if (!normalizedDays.includes(todayCode)) {
    return false;
  }
  const scheduledMinutes = parseSendTime(config.sendTime);
  const diff = meta.minutesSinceMidnight - scheduledMinutes;
  return diff >= 0 && diff < windowMinutes;
}

export function computeNextDeliveryLabel(config: ScheduleConfig, referenceDate = new Date()) {
  const timezone = config.timezone || "Asia/Seoul";
  const meta = getZonedScheduleMeta(timezone, referenceDate);
  const normalizedDays = config.days
    .map(normalizeWeekday)
    .map((day) => ({ day, index: DAY_ORDER.indexOf(day as (typeof DAY_ORDER)[number]) }))
    .filter((entry) => entry.index >= 0);

  if (meta.weekdayIndex < 0 || normalizedDays.length === 0) {
    return `다음 ${config.sendTime}`;
  }

  const scheduledMinutes = parseSendTime(config.sendTime);
  let best = {
    minutesUntil: Number.POSITIVE_INFINITY,
    daysUntil: 0,
    targetIndex: normalizedDays[0].index,
  };

  for (const option of normalizedDays) {
    let daysAhead = (option.index - meta.weekdayIndex + 7) % 7;
    let minutesAhead = scheduledMinutes - meta.minutesSinceMidnight;
    if (daysAhead === 0 && minutesAhead <= 0) {
      daysAhead = 7;
    }
    const totalMinutesAhead = daysAhead * 24 * 60 + minutesAhead;
    if (totalMinutesAhead < best.minutesUntil) {
      best = {
        minutesUntil: totalMinutesAhead,
        daysUntil: daysAhead,
        targetIndex: option.index,
      };
    }
  }

  if (!isFinite(best.minutesUntil)) {
    return `다음 ${config.sendTime}`;
  }

  const weekdayLabel = WEEKDAY_LABELS[DAY_ORDER[best.targetIndex]] ?? DAY_ORDER[best.targetIndex];
  if (best.daysUntil === 0) {
    return `오늘 ${config.sendTime}`;
  }
  if (best.daysUntil === 1) {
    return `내일 ${config.sendTime}`;
  }
  return `다음 ${weekdayLabel}요일 ${config.sendTime}`;
}
