import "server-only";

interface NotificationMessage {
  type: "staff_invite" | "password_reset";
  recipient: string;
  link: string;
  expiresAt: string;
}

export async function sendNotification(message: NotificationMessage): Promise<"sent" | "not_configured"> {
  const endpoint = process.env.NOTIFICATIONS_WEBHOOK_URL;
  const bearer = process.env.NOTIFICATIONS_WEBHOOK_TOKEN;
  if (!endpoint) return "not_configured";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Notification provider returned ${response.status}`);
  return "sent";
}
