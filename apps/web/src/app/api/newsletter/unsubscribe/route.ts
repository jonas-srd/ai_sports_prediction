import { unsubscribeNewsletterSubscriber } from "@ai-sports-prediction/db";
import { NextResponse, type NextRequest } from "next/server";
import { getNewsletterDb } from "@/lib/newsletter-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return new NextResponse(renderMessage("Missing unsubscribe token."), {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 400
    });
  }

  const ok = await unsubscribeNewsletterSubscriber(getNewsletterDb(), token).catch(() => false);

  return new NextResponse(
    renderMessage(ok ? "You have been unsubscribed from the AI Sports Prediction newsletter." : "This unsubscribe link is invalid or already used."),
    {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: ok ? 200 : 404
    }
  );
}

function renderMessage(message: string): string {
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Newsletter | AI Sports Prediction</title>
        <style>
          body {
            align-items: center;
            background: #07130f;
            color: #f6fff8;
            display: flex;
            font-family: Inter, Arial, sans-serif;
            justify-content: center;
            margin: 0;
            min-height: 100vh;
            padding: 24px;
          }
          main {
            background: #10201a;
            border: 1px solid rgba(125, 245, 193, 0.22);
            border-radius: 8px;
            max-width: 560px;
            padding: 28px;
          }
          a { color: #7df5c1; }
        </style>
      </head>
      <body>
        <main>
          <p>AI Sports Prediction</p>
          <h1>Newsletter</h1>
          <p>${escapeHtml(message)}</p>
          <a href="/">Back to website</a>
        </main>
      </body>
    </html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
