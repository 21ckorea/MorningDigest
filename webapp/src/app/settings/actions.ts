"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateDeliverySetting, updateNotificationSetting } from "@/server/store";

const deliverySchema = z.object({
  groupId: z.string().min(1),
  summaryLength: z.enum(["short", "standard", "long"]),
  template: z.enum(["compact", "insight", "full"]),
  channels: z.array(z.enum(["email", "slack", "sms"])).min(1),
});

export async function updateDeliverySettingAction(formData: FormData) {
  const raw = {
    groupId: formData.get("groupId"),
    summaryLength: formData.get("summaryLength"),
    template: formData.get("template"),
    channels: formData.getAll("channels"),
  };

  const data = deliverySchema.parse(raw);
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
