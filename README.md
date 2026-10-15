# ApplyWise

ApplyWise is a local-first internship application tracker with a rule-based skill-gap analyzer. It uses FastAPI, SQLite, and React; applications are stored on disk and remain available when the backend restarts.

## Requirements

- Python 3.10+
- Node.js 20.19+ or 22.12+
- npm

## Run locally

Open two terminals from the project root.

### 1. Start the API

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at <http://localhost:8000>. Interactive endpoint documentation is at <http://localhost:8000/docs>. On startup, SQLite initializes `backend/applywise.db`; the database is intentionally excluded from Git.

To store the database elsewhere, set `APPLYWISE_DATABASE_PATH` before starting the API.

### 2. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (typically <http://localhost:5173>). The frontend uses `http://localhost:8000` by default. To configure another API origin, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.

## Features

- Create, list, update status, search, filter, and delete internship applications.
- Track company, role, optional posting URL, status, deadline, and creation time.
- See live totals for applications, in-progress applications, interviews, and offers.
- Analyze job descriptions for Python, FastAPI, SQL (including SQLite and PostgreSQL), Machine Learning (including scikit-learn and sklearn), React, Docker, Git, and REST APIs.
- Receive a matched/missing skill list and a match percentage. This is a keyword-based aid, not an assessment of a candidate's potential.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `POST` | `/applications` | Create an application (`201 Created`) |
| `GET` | `/applications` | List applications |
| `PATCH` | `/applications/{application_id}/status` | Update an application status |
| `DELETE` | `/applications/{application_id}` | Delete an application |
| `POST` | `/analyze` | Analyze a job description |

Valid statuses: `Saved`, `Applied`, `Assessment`, `Interview`, `Offer`, and `Rejected`. Missing application IDs return `404`; invalid request data returns `422`.

## Tests and production build

From the project root:

```powershell
cd backend
pytest
```

```powershell
cd frontend
npm run build
```
