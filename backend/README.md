# DeadlineZero Planner API

FastAPI backend for study-plan generation. Matches the contract used by
`frontend/` (Flutter) and `hackathon-mobile/` (Expo).

## Run (Docker)

```powershell
cd backend
docker build -t deadlinezero-planner .
docker run -d --name dz-planner -p 8000:8000 deadlinezero-planner
curl http://127.0.0.1:8000/health
# {"status":"ok"}
```

## Run (local Python 3.11+)

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health` → `{"status":"ok"}`
- `POST /api/plan/generate`
  `{available_minutes, day_start, tasks:[{id,title,due_at,estimated_minutes,importance,difficulty}]}`
- `POST /api/plan/rescue`
  `{remaining_minutes, resume_time, missed_session_ids, reason, tasks}`

## Reaching it from a phone

The Android emulator uses `http://10.0.2.2:8000`. A **physical phone** on the
same Wi-Fi must use your PC's LAN IP, e.g. `http://192.168.1.13:8000`, and
Windows must allow inbound TCP 8000 (run as Admin):

```powershell
New-NetFirewallRule -DisplayName "DeadlineZero API" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

Set the Expo app's URL in `hackathon-mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.13:8000
```
