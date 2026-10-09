export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type SessionStatus = 'planned' | 'completed' | 'missed';

export interface Task {
  id: string;
  userId: string;
  title: string;
  subject: string;
  description?: string;
  dueAt: string; // ISO string
  estimatedMinutes: number;
  importance: number; // 1-5
  difficulty: number; // 1-5
  status: TaskStatus;
  createdAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId: string;
  title: string;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  status: SessionStatus;
  reason?: string;
  createdAt: string;
}

export interface GeneratedPlanResult {
  sessions: StudySession[];
  unscheduledTaskIds: string[];
  remainingMinutes: number;
}

export function sessionDurationMinutes(s: StudySession): number {
  return Math.max(
    0,
    Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000),
  );
}
