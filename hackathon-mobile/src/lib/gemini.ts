import type { StudySession, Task } from './types';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

export const GEMINI_MODEL =
  process.env.EXPO_PUBLIC_GEMINI_MODEL && process.env.EXPO_PUBLIC_GEMINI_MODEL.length > 0
    ? process.env.EXPO_PUBLIC_GEMINI_MODEL
    : 'gemini-3.8-flash';

/** False until a Google AI Studio key is set — AI UI shows a setup hint. */
export const isGeminiConfigured = apiKey.length > 0;

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

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

async function callGemini(system: string, contents: { role: string; parts: GeminiPart[] }[]): Promise<string> {
  if (!isGeminiConfigured) {
    throw new Error('Gemini API key is not set. Add EXPO_PUBLIC_GEMINI_API_KEY to .env and restart Expo.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  const payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
    signal: controller.signal,
  };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const post = (attempt: number): Promise<Response> =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      payload,
    ).then((res) => {
      // Transient model overload: one automatic retry after a short wait.
      if ((res.status === 503 || res.status === 500) && attempt === 0) {
        return sleep(1500).then(() => post(1));
      }
      return res;
    });
  try {
    const res = await post(0);
    const data = (await res.json().catch(() => ({}))) as GeminiResponse;
    if (!res.ok) {
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(data.error?.message ?? 'Gemini rejected the request — check your API key.');
      }
      if (res.status === 404) {
        throw new Error(`Model "${GEMINI_MODEL}" not found — check EXPO_PUBLIC_GEMINI_MODEL.`);
      }
      if (res.status === 429) {
        throw new Error('Gemini quota exceeded — try again in a bit.');
      }
      throw new Error(data.error?.message ?? `Gemini request failed (${res.status}).`);
    }
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (text.length > 0) return text;
    const blocked = data.promptFeedback?.blockReason ?? data.candidates?.[0]?.finishReason;
    throw new Error(blocked ? `Gemini blocked the response (${blocked}).` : 'Gemini returned an empty response.');
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Gemini timed out — check your connection and try again.');
    }
    throw e instanceof Error ? e : new Error('Gemini request failed.');
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

const COACH_SYSTEM =
  'You are DeadlineZero, a friendly AI study coach inside a student planner app. ' +
  'Be concise, encouraging, and practical. Use short paragraphs and simple bullet lists. ' +
  'Never use markdown tables. When asked about planning, refer to the concrete tasks and sessions below.';

export async function sendChatMessage(history: ChatMessage[], context: string): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const system = `${COACH_SYSTEM}\nToday is ${today}.\n\nStudent context:\n${context}`;
  return callGemini(
    system,
    history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
  );
}

export async function enrichTask(freeText: string): Promise<EnrichedTask> {
  const today = new Date().toISOString();
  const system =
    'Extract a student assignment from the user text. Respond with ONLY a JSON object, no code fences, ' +
    'with keys: title (string, required), subject (string, required, guess the course), ' +
    'description (string, optional), dueAt (ISO 8601 datetime string, only if the text mentions a date, day, or deadline), ' +
    'estimatedMinutes (number 15-360, default 60), importance (1-5, default 3), difficulty (1-5, default 3).';
  const raw = await callGemini(system, [
    { role: 'user', parts: [{ text: `Today is ${today}. Assignment text: ${freeText}` }] },
  ]);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error('Gemini returned an unreadable answer — try rephrasing.');
  }
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  if (!title) throw new Error('Gemini could not find a title — try rephrasing.');
  const clamp = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(5, Math.max(1, Math.round(v))) : fallback;
  const minutes =
    typeof parsed.estimatedMinutes === 'number' && Number.isFinite(parsed.estimatedMinutes)
      ? Math.min(360, Math.max(15, Math.round(parsed.estimatedMinutes)))
      : 60;
  const result: EnrichedTask = {
    title,
    subject: typeof parsed.subject === 'string' && parsed.subject.trim() ? parsed.subject.trim() : 'General',
    estimatedMinutes: minutes,
    importance: clamp(parsed.importance, 3),
    difficulty: clamp(parsed.difficulty, 3),
  };
  if (typeof parsed.description === 'string' && parsed.description.trim()) {
    result.description = parsed.description.trim();
  }
  if (typeof parsed.dueAt === 'string' && !Number.isNaN(new Date(parsed.dueAt).getTime())) {
    result.dueAtISO = new Date(parsed.dueAt).toISOString();
  }
  return result;
}
