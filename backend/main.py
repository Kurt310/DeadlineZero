"""DeadlineZero planner API — FastAPI backend matching the client contract.

Endpoints:
  GET  /health               -> {"status": "ok"}
  POST /api/plan/generate    -> optimal study blocks for today's budget
  POST /api/plan/rescue      -> re-plan around missed sessions / remaining time
  POST /api/ai/chat          -> local Ollama study-coach reply
  POST /api/ai/enrich        -> local Ollama assignment extraction
"""

import json
import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import FastAPI, HTTPException
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
    """Parse ISO datetime → aware UTC. Raises ValueError on bad input (→ 422)."""
    if not iso or not isinstance(iso, str):
        raise ValueError("datetime must be a non-empty ISO string")
    s = iso.strip()
    if s.endswith(("Z", "z")):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError as e:
        raise ValueError(f"invalid ISO datetime: {iso!r}") from e
    if dt.tzinfo is None:
        # Naive input (e.g. Flutter toIso8601String on local time) → assume UTC
        # so mixed naive/aware fleets never crash with TypeError.
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _priority(task: PlanTask, now: datetime) -> float:
    days_left = (_parse(task.due_at) - now).total_seconds() / 86400.0
    return task.importance * 3 + task.difficulty * 2 - days_left * 1.5


def _due_label(task: PlanTask, now: datetime) -> str:
    days = round((_parse(task.due_at) - now).total_seconds() / 86400.0)
    if days < 0:
        return f"overdue by {abs(days)}d"
    return f"due in {days}d"


def build_plan(tasks: list[PlanTask], start: datetime, budget: int) -> PlanOut:
    now = datetime.now(timezone.utc)
    ordered = sorted(tasks, key=lambda t: _priority(t, now), reverse=True)

    sessions: list[SessionOut] = []
    unscheduled: list[str] = []
    remaining = budget
    slot = start
    seq = 0

    for i, task in enumerate(ordered):
        if remaining < 25:
            unscheduled.append(task.id)
            continue
        duration = max(25, min(task.estimated_minutes, 50 if remaining > 50 else remaining))
        end = slot + timedelta(minutes=duration)
        label = _due_label(task, now)
        seq += 1
        sessions.append(
            SessionOut(
                id=f"sess-{seq}",
                task_id=task.id,
                title=task.title,
                starts_at=slot.isoformat(),
                ends_at=end.isoformat(),
                status="planned",
                reason=(
                    f"Priority {task.importance}/5 · difficulty {task.difficulty}/5 · "
                    f"{label}"
                ),
            )
        )
        remaining -= duration
        # Only charge a 10-min break when another task can still be scheduled.
        # Previously the trailing break was always charged, under-reporting
        # remaining by 10 and stranding small budgets.
        has_more = i + 1 < len(ordered)
        if has_more and remaining - 10 >= 25:
            slot = end + timedelta(minutes=10)
            remaining -= 10
        else:
            slot = end

    return PlanOut(sessions=sessions, unscheduled_task_ids=unscheduled,
                   remaining_minutes=max(0, remaining))


# ---------- Routes ----------

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")

COACH_SYSTEM = (
    "You are DeadlineZero, a friendly AI study coach inside a student planner app. "
    "Be concise, encouraging, and practical. Use short paragraphs and simple bullet lists. "
    "Never use markdown tables. When asked about planning, refer to the concrete tasks and sessions below."
)

ENRICH_SYSTEM = (
    "Extract a student assignment from the user text. Respond with ONLY a JSON object, no code fences, "
    "with keys: title (string, required), subject (string, required, guess the course), "
    "description (string, optional), dueAt (ISO 8601 datetime string, only if the text mentions a date, day, or deadline), "
    "estimatedMinutes (number 15-360, default 60), importance (1-5, default 3), difficulty (1-5, default 3)."
)


class ChatMsg(BaseModel):
    role: str = "user"
    text: str = ""


class ChatRequest(BaseModel):
    messages: list[ChatMsg] = []
    context: str = ""


class ChatResponse(BaseModel):
    reply: str
    model: str


class EnrichRequest(BaseModel):
    text: str


class EnrichResponse(BaseModel):
    title: str
    subject: str = "General"
    description: str | None = None
    dueAtISO: str | None = Field(default=None, alias="dueAt")
    estimatedMinutes: int = 60
    importance: int = 3
    difficulty: int = 3

    model_config = {"populate_by_name": True}


def _ollama_chat(messages: list[dict[str, str]], system: str, timeout: float = 90.0) -> str:
    try:
        res = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [{"role": "system", "content": system}, *messages],
                "stream": False,
                "options": {"temperature": 0.7},
            },
            timeout=timeout,
        )
    except httpx.ConnectError as e:
        raise HTTPException(
            status_code=502,
            detail="Ollama is not running — start it with `ollama serve` and pull a model (`ollama pull llama3.1:8b`).",
        ) from e
    except httpx.TimeoutException as e:
        raise HTTPException(status_code=504, detail="Local AI timed out — try a smaller model or try again.") from e
    if res.status_code == 404:
        raise HTTPException(
            status_code=502,
            detail=f'Ollama model "{OLLAMA_MODEL}" not found — run `ollama pull {OLLAMA_MODEL}` or set OLLAMA_MODEL.',
        )
    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Ollama request failed ({res.status_code}).")
    try:
        data = res.json()
    except ValueError as e:
        raise HTTPException(status_code=502, detail="Ollama returned an unreadable answer.") from e
    text = str(data.get("message", {}).get("content", "") or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="Local AI returned an empty response.")
    return text


@app.get("/health")
def health() -> dict[str, object]:
    ollama: dict[str, object] = {"model": OLLAMA_MODEL}
    try:
        res = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3.0)
        ollama["status"] = "ok" if res.status_code < 400 else f"http-{res.status_code}"
    except Exception:
        ollama["status"] = "down"
    return {"status": "ok", "ollama": ollama}


@app.get("/")
def root() -> dict[str, object]:
    return {
        "service": "deadlinezero-planner",
        "version": "1.0.0",
        "endpoints": ["/health", "/api/plan/generate", "/api/plan/rescue", "/api/ai/chat", "/api/ai/enrich"],
    }


@app.post("/api/plan/generate", response_model=PlanOut)
def generate(req: GenerateRequest) -> PlanOut:
    try:
        start = _parse(req.day_start)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    try:
        return build_plan(req.tasks, start, req.available_minutes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.post("/api/plan/rescue", response_model=PlanOut)
def rescue(req: RescueRequest) -> PlanOut:
    # Re-run the scheduler from the resume time with the remaining budget.
    # Missed-session context is captured in the reasons below.
    try:
        start = _parse(req.resume_time)
        plan = build_plan(req.tasks, start, req.remaining_minutes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if req.missed_session_ids and plan.sessions:
        note = f"Re-planned after {len(req.missed_session_ids)} missed block(s): {req.reason}".strip()
        plan.sessions[0].reason = f"{plan.sessions[0].reason} · {note}" if plan.sessions[0].reason else note
    return plan


@app.post("/api/ai/chat", response_model=ChatResponse)
def ai_chat(req: ChatRequest) -> ChatResponse:
    today = datetime.now(timezone.utc).strftime("%A, %B %d")
    system = f"{COACH_SYSTEM}\nToday is {today}.\n\nStudent context:\n{req.context or '(none)'}"
    msgs = [
        {"role": "user" if m.role == "user" else "assistant", "content": m.text}
        for m in req.messages
        if m.text.strip()
    ]
    if not msgs:
        raise HTTPException(status_code=422, detail="messages must not be empty")
    reply = _ollama_chat(msgs, system)
    return ChatResponse(reply=reply, model=OLLAMA_MODEL)


@app.post("/api/ai/enrich", response_model=EnrichResponse)
def ai_enrich(req: EnrichRequest) -> EnrichResponse:
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text must not be empty")
    today = datetime.now(timezone.utc).isoformat()
    raw = _ollama_chat(
        [{"role": "user", "content": f"Today is {today}. Assignment text: {text}"}],
        ENRICH_SYSTEM,
        timeout=60.0,
    )
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
        cleaned = cleaned[: -3] if cleaned.rstrip().endswith("```") else cleaned
        cleaned = cleaned.strip()
    try:
        parsed = json.loads(cleaned)
    except ValueError as e:
        raise HTTPException(status_code=502, detail="Local AI returned an unreadable answer — try rephrasing.") from e
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="Local AI returned an unreadable answer — try rephrasing.")
    title = str(parsed.get("title", "") or "").strip()
    if not title:
        raise HTTPException(status_code=502, detail="Local AI could not find a title — try rephrasing.")

    def clamp(v: object, fallback: int) -> int:
        return min(5, max(1, round(float(v)))) if isinstance(v, (int, float)) else fallback

    minutes_raw = parsed.get("estimatedMinutes", 60)
    minutes = min(360, max(15, round(float(minutes_raw)))) if isinstance(minutes_raw, (int, float)) else 60
    due_iso: str | None = None
    due_raw = parsed.get("dueAt")
    if isinstance(due_raw, str) and due_raw.strip():
        try:
            due_iso = _parse(due_raw.strip()).isoformat()
        except ValueError:
            due_iso = None
    desc_raw = parsed.get("description")
    return EnrichResponse(
        title=title[:140],
        subject=str(parsed.get("subject", "") or "General").strip()[:80] or "General",
        description=str(desc_raw).strip()[:2000] if isinstance(desc_raw, str) and desc_raw.strip() else None,
        dueAtISO=due_iso,
        estimatedMinutes=minutes,
        importance=clamp(parsed.get("importance"), 3),
        difficulty=clamp(parsed.get("difficulty"), 3),
    )
