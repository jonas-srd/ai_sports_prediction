llm-kicktipp/
├── apps/
│   ├── web/          ← Next.js Frontend
│   └── cron/         ← Node.js Scheduler
├── packages/
│   ├── db/           ← Datenbankschema + Queries (Drizzle ORM)
│   ├── llm/          ← OpenRouter Client + alle 8 Model-Configs
│   └── scorer/       ← Kicktipp-Punkte-Logik
└── package.json      ← npm workspaces
