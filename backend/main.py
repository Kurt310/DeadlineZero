"""DeadlineZero planner API — FastAPI backend matching the client contract.

Endpoints:
  GET  /health               -> {"status": "ok"}
  POST /api/plan/generate    -> optimal study blocks for today's budget
  POST /api/plan/rescue      -> re-plan around missed sessions / remaining time
"""

from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="DeadlineZero Planner", version="1.0.0")

# Hackathon LAN: Expo Go on a physical phone + emulator must reach this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models (mirror the Flutter/Expo client contract) ----------

class PlanTask(BaseModel):
    id: str
    title: str
    due_at: str
    estimated_minutes: int = Field(ge=1)
    importance: int = Field(ge=1, le=5)
    difficulty: int = Field(ge=1, le=5)


class GenerateRequest(BaseModel):
    available_minutes: int = Field(ge=0)
    day_start: str
    tasks: list[PlanTask] = []


class RescueRequest(BaseModel):
    remaining_minutes: int = Field(ge=0)
    resume_time: str
    missed_session_ids: list[str] = []
    reason: str = ""
    tasks: list[PlanTask] = []


class SessionOut(BaseModel):
    id: str
    task_id: str
    title: str
    starts_at: str
    ends_at: str
    status: str = "planned"
    reason: str | None = None


class PlanOut(BaseModel):
    sessions: list[SessionOut] = []
    unscheduled_task_ids: list[str] = []
    remaining_minutes: int = 0


# ---------- Scheduler ----------

def _parse(iso: str) -> datetime:
    # Tolerate trailing "Z" as well as explicit offsets.
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def _priority(task: PlanTask, now: datetime) -> float:
    days_left = (_parse(task.due_at) - now).total_seconds() / 86400.0
    return task.importance * 3 + task.difficulty * 2 - days_left * 1.5


def build_plan(tasks: list[PlanTask], start: datetime, budget: int) -> PlanOut:
    now = datetime.now(start.tzinfo) if start.tzinfo else datetime.now()
    ordered = sorted(tasks, key=lambda t: _priority(t, now), reverse=True)

    sessions: list[SessionOut] = []
    unscheduled: list[str] = []
    remaining = budget
    slot = start

    for i, task in enumerate(ordered):
        if remaining < 25:
            unscheduled.append(task.id)
            continue
        duration = max(25, min(task.estimated_minutes, 50 if remaining > 50 else remaining))
        end = slot + timedelta(minutes=duration)
        days_left = max(0, round((_parse(task.due_at) - now).total_seconds() / 86400.0))
        sessions.append(
            SessionOut(
                id=f"sess-{i + 1}",
                task_id=task.id,
                title=task.title,
                starts_at=slot.isoformat(),
                ends_at=end.isoformat(),
                status="planned",
                reason=(
                    f"Priority {task.importance}/5 · difficulty {task.difficulty}/5 · "
                    f"due in {days_left}d"
                ),
            )
        )
        remaining -= duration
        if remaining >= 15:
            slot = end + timedelta(minutes=10)
            remaining -= 10
        else:
            slot = end

    return PlanOut(sessions=sessions, unscheduled_task_ids=unscheduled,
                   remaining_minutes=max(0, remaining))


# ---------- Routes ----------

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, object]:
    return {
        "service": "deadlinezero-planner",
        "version": "1.0.0",
        "endpoints": ["/health", "/api/plan/generate", "/api/plan/rescue"],
    }


@app.post("/api/plan/generate", response_model=PlanOut)
def generate(req: GenerateRequest) -> PlanOut:
    return build_plan(req.tasks, _parse(req.day_start), req.available_minutes)


@app.post("/api/plan/rescue", response_model=PlanOut)
def rescue(req: RescueRequest) -> PlanOut:
    # Re-run the scheduler from the resume time with the remaining budget.
    # Missed-session context is captured in the reasons below.
    plan = build_plan(req.tasks, _parse(req.resume_time), req.remaining_minutes)
    if req.missed_session_ids and plan.sessions:
        note = f"Re-planned after {len(req.missed_session_ids)} missed block(s): {req.reason}".strip()
        plan.sessions[0].reason = f"{plan.sessions[0].reason} · {note}" if plan.sessions[0].reason else note
    return plan
