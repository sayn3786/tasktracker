# TeamTask

Enterprise-style task tracker with project onboarding, member onboarding, task grid, Kanban board, insights, task-level activity history, and SQLite persistence.

## Run locally

```bash
pip install -r requirements.txt
python server.py
```

Open `http://localhost:5000`.

## Included

- Grid view with search and filters
- Drag-and-drop task board with scrollable columns
- Insights view with task counts and charts
- Project onboarding with status, start date, end date, and labels
- Team member onboarding with optional project assignment
- Read-only project and team member tables
- Task-level activity history
- SQLite-backed state API at `/api/tasktracker/state`
