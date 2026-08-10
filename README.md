# FinanceFlow v2

A simple personal finance tracker — add income/expense entries, see your running balance, and review recent activity. Built with React + Vite, backed by Supabase.

## Supabase table needed

Create a table called `transactions` with these columns:

| column   | type      |
|----------|-----------|
| id       | int8 (auto, primary key) |
| type     | text (`income` or `expense`) |
| amount   | numeric   |
| category | text      |
| note     | text      |
| date     | date      |

## Environment variables (set these in Vercel, not in this repo)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Both values come from your Supabase project: **Settings → API**.

## Local development (optional)

```
npm install
npm run dev
```
