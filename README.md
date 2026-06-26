# TeamTask

Enterprise-style task tracker with project onboarding, member onboarding, task grid, Kanban board, insights, task-level activity history, and Neon Postgres persistence.

## Run locally

```bash
pip install -r requirements.txt
copy .env.example .env
python server.py
```

Open `http://localhost:5000`.

Set `DATABASE_URL` in `.env` before running. For Neon, use the pooled Postgres connection string and keep `sslmode=require`.

## Deploy to Vercel with Neon

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add Neon Postgres from the Vercel Marketplace, or create a Neon project manually.
4. Add `DATABASE_URL` to the Vercel project environment variables.
5. Deploy.

The app stores its workspace state in the `app_state` Postgres table as JSONB. The table is created automatically on the first read or write.

## Included

- Grid view with search and filters
- Drag-and-drop task board with scrollable columns
- Insights view with task counts and charts
- Project onboarding with status, start date, end date, and labels
- Team member onboarding with optional project assignment
- Read-only project and team member tables
- Task-level activity history
- Neon Postgres-backed state API at `/api/tasktracker/state`
