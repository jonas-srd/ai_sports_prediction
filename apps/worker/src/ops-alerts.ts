const lastAlertAt = new Map<string, number>();
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

export async function sendOperationsAlert(input: {
  error: unknown;
  jobName: string;
  queueName: string;
}) {
  const recipients = (process.env.OPS_ALERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.OPS_ALERT_FROM_EMAIL?.trim() || process.env.NEWSLETTER_FROM_EMAIL?.trim();
  if (!apiKey || !from || recipients.length === 0) return;

  const key = `${input.queueName}:${input.jobName}`;
  const now = Date.now();
  if (now - (lastAlertAt.get(key) ?? 0) < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(key, now);

  const message = input.error instanceof Error
    ? `${input.error.message}\n\n${input.error.stack ?? ""}`
    : String(input.error);
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `AI Sports Prediction · Job fehlgeschlagen: ${input.jobName}`,
      text: [
        `Queue: ${input.queueName}`,
        `Job: ${input.jobName}`,
        `Zeit: ${new Date().toISOString()}`,
        "",
        message.slice(0, 12_000)
      ].join("\n")
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    method: "POST"
  });
  if (!response.ok) {
    console.error(`Operations alert could not be sent (${response.status}).`);
  }
}
