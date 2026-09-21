import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { isPublicBusinessEnabled, publicBusinessUnavailable } from "./public-business";

const guardedRoutes = [
  [
    "newsletter/subscribe",
    [
      "POST"
    ]
  ],
  [
    "newsletter/unsubscribe",
    [
      "GET"
    ]
  ],
  [
    "widgets/access-request",
    [
      "POST"
    ]
  ],
  [
    "widgets/account",
    [
      "GET",
      "POST"
    ]
  ],
  [
    "widgets/account/auth/request",
    [
      "POST"
    ]
  ],
  [
    "widgets/account/auth/verify",
    [
      "GET"
    ]
  ],
  [
    "widgets/stripe/webhook",
    [
      "POST"
    ]
  ],
  [
    "widgets/matches",
    [
      "GET"
    ]
  ],
  [
    "widgets/predictions",
    [
      "GET"
    ]
  ],
  [
    "reddit/oauth/start",
    [
      "GET"
    ]
  ],
  [
    "reddit/oauth/callback",
    [
      "GET"
    ]
  ],
  [
    "tiktok/oauth/start",
    [
      "GET"
    ]
  ],
  [
    "tiktok/oauth/callback",
    [
      "GET"
    ]
  ],
  [
    "admin/newsletter/send",
    [
      "POST"
    ]
  ],
  [
    "admin/widget-leads",
    [
      "PATCH"
    ]
  ],
  [
    "admin/widget-customers",
    [
      "POST"
    ]
  ],
  [
    "admin/revenue-dashboard",
    [
      "POST"
    ]
  ],
  [
    "admin/outreach",
    [
      "PATCH"
    ]
  ],
  [
    "admin/marketing",
    [
      "PATCH"
    ]
  ]
] as const;

test("public business requires exact explicit opt-in and otherwise returns a no-store 503", async () => {
  const previous = process.env.PUBLIC_BUSINESS_ENABLED;
  try {
    for (const value of [undefined, "", "0", "true", "yes", " 1 ", "unexpected"]) {
      if (value === undefined) delete process.env.PUBLIC_BUSINESS_ENABLED;
      else process.env.PUBLIC_BUSINESS_ENABLED = value;
      assert.equal(isPublicBusinessEnabled(), false);
      const response = publicBusinessUnavailable()!;
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal((await response.json()).error, "business_temporarily_unavailable");
    }
    process.env.PUBLIC_BUSINESS_ENABLED = "1";
    assert.equal(isPublicBusinessEnabled(), true);
    assert.equal(publicBusinessUnavailable(), null);
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_BUSINESS_ENABLED;
    else process.env.PUBLIC_BUSINESS_ENABLED = previous;
  }
});

test("every business route checks quarantine before parsing, authentication, providers or database work", () => {
  for (const [route, methods] of guardedRoutes) {
    const source = readFileSync(new URL(`../app/api/${route}/route.ts`, import.meta.url), "utf8");
    assert.match(source, /import \{ publicBusinessUnavailable \} from "@\/lib\/public-business"/);
    for (const method of methods) {
      const signature = `export async function ${method}(request: NextRequest) {`;
      const start = source.indexOf(signature);
      assert.notEqual(start, -1, `${method} ${route}`);
      assert.match(source.slice(start + signature.length), /^\s*const businessUnavailable = publicBusinessUnavailable\(\);\s*if \(businessUnavailable\) return businessUnavailable;/, `${method} ${route}`);
    }
  }
});

test("public business handlers do not touch request bodies, database pools or network during quarantine", async () => {
  const previous = process.env.PUBLIC_BUSINESS_ENABLED;
  const originalFetch = globalThis.fetch;
  const oldWidgetDb = globalThis.aiSportsWidgetDb;
  const oldNewsletterDb = globalThis.aiSportsNewsletterDb;
  process.env.PUBLIC_BUSINESS_ENABLED = "0";
  const forbidden = () => { throw new Error("Business side effect attempted while disabled"); };
  globalThis.fetch = forbidden;
  globalThis.aiSportsWidgetDb = { query: forbidden } as any;
  globalThis.aiSportsNewsletterDb = { query: forbidden } as any;
  try {
    for (const [route, methods] of guardedRoutes.filter(([route]) => !route.startsWith("admin/") && !route.includes("/oauth/"))) {
      const module = await import(`../app/api/${route}/route.ts`);
      for (const method of methods) {
        const request = new NextRequest(`https://residualsports.com/api/${route}?token=unused&key=restored-key`, {
          method,
          ...(method === "POST" ? { body: "{", headers: { "content-type": "application/json" } } : {})
        });
        Object.defineProperty(request, "json", { value: forbidden });
        Object.defineProperty(request, "text", { value: forbidden });
        const response = await module[method](request);
        assert.equal(response.status, 503, `${method} ${route}`);
        assert.equal((await response.json()).error, "business_temporarily_unavailable");
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.aiSportsWidgetDb = oldWidgetDb;
    globalThis.aiSportsNewsletterDb = oldNewsletterDb;
    if (previous === undefined) delete process.env.PUBLIC_BUSINESS_ENABLED;
    else process.env.PUBLIC_BUSINESS_ENABLED = previous;
  }
});

test("full-site UI hides newsletter collection and pauses checkout, login and paid widget tools", () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(source("../app/layout.tsx"), /isPublicBusinessEnabled\(\) \? <NewsletterSignupModal/);
  assert.match(source("../app/widgets/page.tsx"), /businessEnabled \? <WidgetGrowthFunnel/);
  assert.match(source("../app/widgets/page.tsx"), /businessEnabled \? <Link href=\{accountHref\}/);
  assert.match(source("../app/widgets/page.tsx"), /isPublicBusinessEnabled\(\) \? <WidgetBuilder/);
  for (const path of [
    "../app/widgets/checkout/page.tsx",
    "../app/widgets/account/page.tsx",
    "../app/widgets/account/login/page.tsx",
    "../app/de/widgets/account/page.tsx",
    "../app/de/widgets/account/login/page.tsx"
  ]) assert.match(source(path), /if \(!isPublicBusinessEnabled\(\)\) return <BusinessUnavailable/);
});

