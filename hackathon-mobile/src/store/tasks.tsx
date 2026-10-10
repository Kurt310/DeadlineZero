import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { GUEST_ID, useAuth } from '@/store/auth';
import type { Task, TaskStatus } from '@/lib/types';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  pendingTasks: Task[];
  completedTasks: Task[];
  urgentTasks: Task[];
  getById: (id: string) => Task | undefined;
  createTask: (t: Task) => Promise<void>;
  updateTask: (t: Task) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  setSessionStatus: (taskId: string, _status: string) => void;
}

const TasksContext = createContext<TasksState | null>(null);

/** Raw row shape of public.tasks (matches supabase/schema.sql). */
interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  description: string | null;
  due_at: string;
  estimated_minutes: number;
  importance: number;
  difficulty: number;
  status: TaskStatus;
  created_at: string;
}

function normalizeISO(raw: string, fallback: string): string {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return fallback;
  return new Date(ms).toISOString();
}

function fromRow(r: TaskRow): Task {
  const nowISO = new Date().toISOString();
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    subject: r.subject,
    description: r.description ?? undefined,
    dueAt: normalizeISO(r.due_at, nowISO),
    estimatedMinutes: r.estimated_minutes,
    importance: r.importance,
    difficulty: r.difficulty,
    status: r.status,
    createdAt: normalizeISO(r.created_at, nowISO),
  };
}

function toInsertRow(t: Task): Omit<TaskRow, 'created_at'> & { created_at?: string } {
  return {
    id: t.id,
    user_id: t.userId,
    title: t.title,
    subject: t.subject,
    description: t.description ?? null,
    due_at: t.dueAt,
    estimated_minutes: t.estimatedMinutes,
    importance: t.importance,
    difficulty: t.difficulty,
    status: t.status,
  };
}

/** Only mutable columns — never rewrite id / user_id / created_at on UPDATE. */
function toUpdateRow(t: Task): Partial<TaskRow> {
  return {
    title: t.title,
    subject: t.subject,
    description: t.description ?? null,
    due_at: t.dueAt,
    estimated_minutes: t.estimatedMinutes,
    importance: t.importance,
    difficulty: t.difficulty,
    status: t.status,
  };
}

function seedTasks(): Task[] {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  return [
    {
      id: 'task-001',
      userId: GUEST_ID,
      title: 'Prepare database reviewer',
      subject: 'Database Systems',
      description: 'Review indexing, normal forms, and transaction isolation levels.',
      dueAt: iso(now + 28 * 3600000),
      estimatedMinutes: 90,
      importance: 5,
      difficulty: 4,
      status: 'in_progress',
      createdAt: iso(now - 3 * 86400000),
    },
    {
      id: 'task-002',
      userId: GUEST_ID,
      title: 'Finish UI prototype',
      subject: 'Human Computer Interaction',
      description: 'Implement high-fidelity Figma components and user flow.',
      dueAt: iso(now + 50 * 3600000),
      estimatedMinutes: 60,
      importance: 4,
      difficulty: 3,
      status: 'pending',
      createdAt: iso(now - 2 * 86400000),
    },
    {
      id: 'task-003',
      userId: GUEST_ID,
      title: 'Algorithms problem set 3',
      subject: 'Data Structures & Algorithms',
      description: 'Complete dynamic programming and graph shortest path problems.',
      dueAt: iso(now + 78 * 3600000),
      estimatedMinutes: 120,
      importance: 5,
      difficulty: 5,
      status: 'pending',
      createdAt: iso(now - 86400000),
    },
    {
      id: 'task-004',
      userId: GUEST_ID,
      title: 'Ethics response paper',
      subject: 'Tech & Society',
      description: 'Write a 2-page essay on AI alignment and copyright ethics.',
      dueAt: iso(now + 4 * 86400000),
      estimatedMinutes: 45,
      importance: 3,
      difficulty: 2,
      status: 'completed',
      createdAt: iso(now - 5 * 86400000),
    },
  ];
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const remote = supabase !== null && userId !== GUEST_ID;

  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const fetchRemote = useCallback(async (forUserId?: string) => {
    if (!supabase) return;
    const owner = forUserId ?? userId;
    if (owner === GUEST_ID) return;
    const myReq = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select()
        .eq('user_id', owner)
        .order('due_at', { ascending: true });
      if (err) throw err;
      if (myReq !== requestId.current) return; // stale response — ignore
      const mapped = ((data ?? []) as TaskRow[]).map(fromRow);
      // Merge: keep local optimistic tasks not yet on server instead of clobbering.
      setTasks((prev) => {
        const remoteIds = new Set(mapped.map((t) => t.id));
        const localOnly = prev.filter((t) => !remoteIds.has(t.id) && t.userId === owner);
        return [...mapped, ...localOnly];
      });
    } catch (e) {
      if (myReq !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Could not load tasks');
    } finally {
      if (myReq === requestId.current) setIsLoading(false);
    }
  }, [userId]);

  // Sync when the signed-in user changes; guests keep local seed data.
  useEffect(() => {
    if (remote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchRemote(userId).catch(() => {});
    } else {
      setTasks((prev) => (prev.length > 0 && prev[0]?.userId === GUEST_ID ? prev : seedTasks()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote, userId]);

  const getById = useCallback((id: string) => tasksRef.current.find((t) => t.id === id), []);

  const createTask = useCallback(async (t: Task) => {
    const stamped = { ...t, userId };
    setTasks((prev) => (prev.some((x) => x.id === stamped.id) ? prev : [stamped, ...prev]));
    if (remote && supabase) {
      const { error: err } = await supabase.from('tasks').insert(toInsertRow(stamped));
      if (err) setError(`Saved locally — Supabase: ${err.message}`);
    }
  }, [remote, userId]);

  const updateTask = useCallback(async (t: Task) => {
    // Never trust the form's userId — force the current owner.
    const stamped = { ...t, userId };
    setTasks((prev) => prev.map((x) => (x.id === stamped.id ? stamped : x)));
    if (remote && supabase) {
      const { error: err } = await supabase
        .from('tasks')
        .update(toUpdateRow(stamped))
        .eq('id', stamped.id)
        .eq('user_id', userId);
      if (err) setError(`Saved locally — Supabase: ${err.message}`);
    }
  }, [remote, userId]);

  const toggleComplete = useCallback(async (id: string) => {
    const current = tasksRef.current.find((t) => t.id === id);
    if (!current) return;
    const status: TaskStatus = current.status === 'completed' ? 'pending' : 'completed';
    // Note: in_progress → completed on check; unchecking returns to pending
    // (documented simplification for the demo core loop).
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    if (remote && supabase) {
      const { error: err } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .eq('user_id', userId);
      if (err) setError(`Saved locally — Supabase: ${err.message}`);
    }
  }, [remote, userId]);

  const deleteTask = useCallback(async (id: string) => {
    const snapshot = tasksRef.current;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (remote && supabase) {
      const { error: err } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (err) {
        // Roll back on sync failure so local list never diverges silently.
        setTasks(snapshot);
        setError(`Delete failed — Supabase: ${err.message}`);
      }
    }
  }, [remote, userId]);

  const refresh = useCallback(async () => {
    if (remote) await fetchRemote(userId).catch(() => {});
  }, [remote, fetchRemote, userId]);

  const setSessionStatus = useCallback((_taskId: string, _status: string) => {
    // Sessions live in plan screen state; kept for API parity with Flutter service.
  }, []);

  const value = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== 'completed');
    const completed = tasks.filter((t) => t.status === 'completed');
    const timeOf = (iso: string) => {
      const ms = new Date(iso).getTime();
      return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
    };
    const urgent = [...pending].sort((a, b) => timeOf(a.dueAt) - timeOf(b.dueAt));
    return {
      tasks, isLoading, error,
      pendingTasks: pending, completedTasks: completed, urgentTasks: urgent,
      getById, createTask, updateTask, toggleComplete, deleteTask, refresh, setSessionStatus,
    };
  }, [tasks, isLoading, error, getById, createTask, updateTask, toggleComplete, deleteTask, refresh, setSessionStatus]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksState {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside TasksProvider');
  return ctx;
}
