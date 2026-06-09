# Local Environment

This project is primarily a Node.js/TypeScript app, with an optional local Python virtual environment for helper scripts.

## Python

Detected locally:

```text
python --version -> Python 3.9.13
py --version     -> Python 3.14.0
```

Project Python version:

```text
3.9.13
```

The local virtual environment lives in:

```text
.venv
```

Activate it in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```powershell
python -m pip install -r requirements.txt
```

Currently `requirements.txt` has no runtime dependencies because the MVP app runs on Node.js/TypeScript.

## Node.js / TypeScript

Main project commands:

```powershell
npm install
npm run db:init
npm run sync:football-data
npm run predict:next
npm run dev
```

Local website:

```text
http://localhost:3000
```

Local SQLite database:

```text
data/world-cup.db
```

## Secrets

Secrets stay in `.env`, which is ignored by git:

```text
FOOTBALL_DATA_API_KEY=
OPENROUTER_API_KEY=
```
