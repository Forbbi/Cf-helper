# CFTracker 🏆

A personal **Codeforces problem tracker** built with React + FastAPI.

## Features

- 🔍 **Problems browser** — filter by tags, rating, solved/unsolved status; loads in batches of 150 with Prev/Next navigation
- 🔖 **Bookmarks** — save problems to review later
- 📊 **Submissions dashboard** — time-range filtering (1M / 3M / 6M / 1Y / All Time), per-difficulty and per-tag charts, and a drill-down panel showing "stuck" problems by tag
- 📈 **Tag analytics** — stacked bar chart (green = clean solves, red = had failures); click the red segment to see all problems you struggled with in that tag
- ⭐ **Inline bookmarking** — bookmark any problem directly from the submissions table or drill-down panel

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python) |
| Data source | [Codeforces API](https://codeforces.com/apiHelp) |
| Storage | SQLite (bookmarks) |

## Quick Start

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment Variables (optional)

Create `backend/.env`:

```
CF_DEFAULT_HANDLE=your_cf_handle
```

This pre-fills the handle on first load.
