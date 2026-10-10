import { API_BASE_URL } from './planner';
import type { StudySession, Task } from './types';

/**
 * Local-AI client — talks to the FastAPI backend (/api/ai/*), which proxies
 * to Ollama running on the dev PC. No API keys on the device.
 */

export const LOCAL_AI_MODEL = 'local-ollama';

/** @deprecated Use isAiConfigured. Kept so old imports don't break. */
export const GEMINI_MODEL = LOCAL_AI_MODEL;
/** Always true — local AI needs no key; backend health determines availability. */
export const isGeminiConfigured = true;
export const isAiConfigured = true;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface EnrichedTask {
  title: string;
  subject: string;
  description?: string;
  /** ISO datetime, present only when the text mentioned a date/deadline. */
  dueAtISO?: string;
  estimatedMinutes?: number;
  importance?: number;
  difficulty?: number;
}

async function postAI(path: string, body: unknown, timeoutMs: number): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : null;
      if (res.status === 422) throw new Error(detail ?? 'Invalid AI request.');
      if (res.status === 502 || res.status === 504) {
        throw new Error(
          detail ?? 'Local AI is unavailable — start the backend (`uvicorn main:app`) and Ollama (`ollama serve`).',
        );
      }
      throw new Error(detail ?? `Local AI request failed (${res.status}).`);
    }
    return data;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Local AI timed out — try a smaller model or try again.');
    }
    if (e instanceof TypeError) {
      throw new Error(
        'Cannot reach the planner backend — start it (`uvicorn main:app --host 0.0.0.0 --port 8000`) and check your connection.',
      );
    }
    throw e instanceof Error ? e : new Error('Local AI request failed.');
  } finally {
    clearTimeout(timer);
  }
}

/** Compact serialization of the student's workload to ground the assistant. */
export function buildStudyContext(tasks: Task[], sessions: StudySession[]): string {
  const taskLines = tasks.slice(0, 20).map((t) => {
    const due = new Date(t.dueAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `- "${t.title}" (${t.subject}), due ${due}, ~${t.estimatedMinutes}m, importance ${t.importance}/5, status ${t.status}`;
  });
  const sessionLines = sessions.slice(0, 15).map((s) => {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `- "${s.title}", ${fmt(s.startsAt)}–${fmt(s.endsAt)}, ${s.status}`;
  });
  return [
    `Tasks (${tasks.length} total):`,
    ...(taskLines.length > 0 ? taskLines : ['(none)']),
    `Planned sessions (${sessions.length} total):`,
    ...(sessionLines.length > 0 ? sessionLines : ['(none)']),
  ].join('\n');
}

export async function sendChatMessage(history: ChatMessage[], context: string): Promise<string> {
  const data = await postAI(
    '/api/ai/chat',
    {
      messages: history.map((m) => ({ role: m.role === 'model' ? 'model' : 'user', text: m.text })),
      context,
    },
    90000,
  );
  const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
  if (!reply) throw new Error('Local AI returned an empty response.');
  return reply;
}

export async function enrichTask(freeText: string): Promise<EnrichedTask> {
  const data = await postAI('/api/ai/enrich', { text: freeText }, 60000);
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) throw new Error('Local AI could not find a title — try rephrasing.');
  const clamp = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(5, Math.max(1, Math.round(v))) : fallback;
  const minutes =
    typeof data.estimatedMinutes === 'number' && Number.isFinite(data.estimatedMinutes)
      ? Math.min(360, Math.max(15, Math.round(data.estimatedMinutes)))
      : 60;
  const result: EnrichedTask = {
    title,
    subject: typeof data.subject === 'string' && data.subject.trim() ? data.subject.trim() : 'General',
    estimatedMinutes: minutes,
    importance: clamp(data.importance, 3),
    difficulty: clamp(data.difficulty, 3),
  };
  if (typeof data.description === 'string' && data.description.trim()) {
    result.description = data.description.trim();
  }
  const dueRaw = (data.dueAtISO ?? data.dueAt) as unknown;
  if (typeof dueRaw === 'string' && !Number.isNaN(new Date(dueRaw).getTime())) {
    result.dueAtISO = new Date(dueRaw).toISOString();
  }
  return result;
}
