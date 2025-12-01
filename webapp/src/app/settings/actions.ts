"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail } from "@/server/auth";
import { getKeywordGroupById, updateDeliverySetting, updateNotificationSetting } from "@/server/store";

const deliverySchema = z.object({
  groupId: z.string().min(1),
  summaryLength: z.enum(["short", "standard", "long"]),
  template: z.enum(["compact", "insight", "full"]),
  channels: z.array(z.enum(["email", "slack", "sms"])).min(1),
});

export async function updateDeliverySettingAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = (session?.user as { id?: string } | null)?.id;

  if (!session || !email || !userId) {
    throw new Error("로그인이 필요합니다.");
  }

  const raw = {
    groupId: formData.get("groupId"),
    summaryLength: formData.get("summaryLength"),
    template: formData.get("template"),
    channels: formData.getAll("channels"),
  };

  const data = deliverySchema.parse(raw);

  const group = await getKeywordGroupById(data.groupId);
  if (!group) {
    throw new Error("그룹을 찾을 수 없습니다.");
  }

  const isOwner = group.ownerId === userId || group.ownerId == null;
  const isAdmin = isAdminEmail(email);
  if (!isOwner && !isAdmin) {
    throw new Error("이 그룹의 발송 설정을 변경할 권한이 없습니다.");
  }

  await updateDeliverySetting(data);
  revalidatePath("/settings");
}

export async function updateNotificationSettingAction(formData: FormData) {
  const payload = {
    sendFailureAlert: formData.get("sendFailureAlert") === "on",
    sendSmsBackup: formData.get("sendSmsBackup") === "on",
    sendWeeklyReport: formData.get("sendWeeklyReport") === "on",
  };

  await updateNotificationSetting(payload);
  revalidatePath("/settings");
}
