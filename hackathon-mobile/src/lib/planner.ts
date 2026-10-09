import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getAccessToken } from './supabase';
import type { GeneratedPlanResult, StudySession, Task } from './types';

/**
 * Planner API client — mirrors Flutter PlannerApiService.
 * Tries the FastAPI backend, falls back to a local heuristic scheduler
 * so the demo always works offline (Expo Go safe, no extra deps).
 */

function defaultBaseUrl(): string {
  // Emulator/simulator aliases for the dev machine. Physical phones can't use
  // loopback, so they MUST set EXPO_PUBLIC_API_BASE_URL to the PC's LAN IP.
  if (Platform.OS === 'android' && !Device.isDevice) return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

// Override with EXPO_PUBLIC_API_BASE_URL in .env if needed.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL && process.env.EXPO_PUBLIC_API_BASE_URL.length > 0
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : defaultBaseUrl();

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/** JSON headers + Supabase JWT when signed in (guest mode sends none). */
async function apiHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function toApiTask(t: Task) {
  return {
    id: t.id,
    title: t.title,
    due_at: t.dueAt,
    estimated_minutes: t.estimatedMinutes,
    importance: t.importance,
    difficulty: t.difficulty,
  };
}

function parsePlan(data: Record<string, unknown>, userId: string): GeneratedPlanResult {
  const raw = (data.sessions as Record<string, unknown>[] | undefined) ?? [];
  const sessions: StudySession[] = raw.map((s, i) => ({
    id: String(s.id ?? `sess-${Date.now()}-${i}`),
    userId,
    taskId: String(s.task_id ?? ''),
    title: String(s.title ?? 'Study Session'),
    startsAt: String(s.starts_at ?? new Date().toISOString()),
    endsAt: String(s.ends_at ?? new Date().toISOString()),
    status: (s.status as StudySession['status']) ?? 'planned',
    reason: s.reason ? String(s.reason) : undefined,
    createdAt: new Date().toISOString(),
  }));
  return {
    sessions,
    unscheduledTaskIds: ((data.unscheduled_task_ids as unknown[] | undefined) ?? []).map(String),
    remainingMinutes: Number(data.remaining_minutes ?? 0),
  };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 4000);
    if (!res.ok) return false;
    const data = (await res.json()) as Record<string, unknown>;
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function generatePlan(
  availableMinutes: number,
  dayStart: Date,
  tasks: Task[],
): Promise<GeneratedPlanResult> {
  const eligible = tasks.filter((t) => t.status !== 'completed');
  if (eligible.length === 0) {
    return { sessions: [], unscheduledTaskIds: [], remainingMinutes: availableMinutes };
  }
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/plan/generate`,
      {
        method: 'POST',
        headers: await apiHeaders(),
        body: JSON.stringify({
          available_minutes: availableMinutes,
          day_start: dayStart.toISOString(),
          tasks: eligible.map(toApiTask),
        }),
      },
      8000,
    );
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    return parsePlan(data, eligible[0].userId);
  } catch {
    return localFallbackPlan(availableMinutes, dayStart, eligible);
  }
}

export async function rescueSchedule(
  remainingMinutes: number,
  resumeTime: Date,
  unfinishedTasks: Task[],
  missedCount: number,
  reasonNotes: string,
): Promise<GeneratedPlanResult> {
  // Try dedicated rescue endpoint first, fall back to generate contract.
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/plan/rescue`,
      {
        method: 'POST',
        headers: await apiHeaders(),
        body: JSON.stringify({
          remaining_minutes: remainingMinutes,
          resume_time: resumeTime.toISOString(),
          missed_session_ids: [],
          reason: reasonNotes,
          tasks: unfinishedTasks.filter((t) => t.status !== 'completed').map(toApiTask),
        }),
      },
      6000,
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const uid = unfinishedTasks[0]?.userId ?? 'guest-user';
      return parsePlan(data, uid);
    }
  } catch {
    // fall through to generatePlan
  }
  const plan = await generatePlan(remainingMinutes, resumeTime, unfinishedTasks);
  void missedCount;
  return plan;
}

/** Client-side heuristic scheduler — port of Flutter's offline fallback. */
export function localFallbackPlan(
  availableMinutes: number,
  dayStart: Date,
  tasks: Task[],
): GeneratedPlanResult {
  const sorted = [...tasks].sort((a, b) => {
    const daysA = (new Date(a.dueAt).getTime() - Date.now()) / 86400000;
    const daysB = (new Date(b.dueAt).getTime() - Date.now()) / 86400000;
    const scoreA = a.importance * 3 + a.difficulty * 2 - daysA * 1.5;
    const scoreB = b.importance * 3 + b.difficulty * 2 - daysB * 1.5;
    return scoreB - scoreA;
  });

  let remaining = availableMinutes;
  let slot = new Date(dayStart);
  const sessions: StudySession[] = [];
  const unscheduled: string[] = [];

  for (const task of sorted) {
    if (remaining < 25) {
      unscheduled.push(task.id);
      continue;
    }
    const duration = Math.min(task.estimatedMinutes, remaining > 50 ? 50 : remaining, Math.max(25, remaining));
    const end = new Date(slot.getTime() + Math.max(25, duration) * 60000);
    const daysLeft = Math.max(0, Math.round((new Date(task.dueAt).getTime() - Date.now()) / 86400000));
    sessions.push({
      id: `sess-gen-${sessions.length + 1}`,
      userId: task.userId,
      taskId: task.id,
      title: `${task.title} (${task.subject})`,
      startsAt: slot.toISOString(),
      endsAt: end.toISOString(),
      status: 'planned',
      reason: `High priority due in ${daysLeft}d; Importance: ${task.importance}/5`,
      createdAt: new Date().toISOString(),
    });
    remaining -= Math.max(25, duration);
    if (remaining >= 15) {
      slot = new Date(end.getTime() + 10 * 60000);
      remaining -= 10;
    } else {
      slot = end;
    }
  }

  return { sessions, unscheduledTaskIds: unscheduled, remainingMinutes: Math.max(0, remaining) };
}
