import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import type { Task, TaskStatus } from '@/lib/types';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  pendingTasks: Task[];
  completedTasks: Task[];
  urgentTasks: Task[];
  getById: (id: string) => Task | undefined;
  createTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  toggleComplete: (id: string) => void;
  deleteTask: (id: string) => void;
  refresh: () => void;
  setSessionStatus: (taskId: string, _status: string) => void;
}

const TasksContext = createContext<TasksState | null>(null);
const GUEST_ID = 'guest-user';

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

function fromRow(r: TaskRow): Task {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    subject: r.subject,
    description: r.description ?? undefined,
    dueAt: r.due_at,
    estimatedMinutes: r.estimated_minutes,
    importance: r.importance,
    difficulty: r.difficulty,
    status: r.status,
    createdAt: r.created_at,
  };
}

function toRow(t: Task): TaskRow {
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
    created_at: t.createdAt,
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

  const fetchRemote = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select()
        .order('due_at', { ascending: true });
      if (err) throw err;
      setTasks(((data ?? []) as TaskRow[]).map(fromRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync when the signed-in user changes; guests keep local seed data.
  useEffect(() => {
    if (remote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchRemote().catch(() => {});
    } else {
      setTasks(seedTasks());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote, userId]);

  const getById = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);

  const createTask = useCallback((t: Task) => {
    const stamped = { ...t, userId };
    setTasks((prev) => [stamped, ...prev]);
    if (remote && supabase) {
      supabase
        .from('tasks')
        .insert(toRow(stamped))
        .then(({ error: err }) => {
          if (err) setError(`Saved locally — Supabase: ${err.message}`);
        });
    }
  }, [remote, userId]);

  const updateTask = useCallback((t: Task) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    if (remote && supabase) {
      supabase
        .from('tasks')
        .update(toRow(t))
        .eq('id', t.id)
        .then(({ error: err }) => {
          if (err) setError(`Saved locally — Supabase: ${err.message}`);
        });
    }
  }, [remote]);

  const toggleComplete = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t): Task => {
        if (t.id !== id) return t;
        const status: TaskStatus = t.status === 'completed' ? 'pending' : 'completed';
        return { ...t, status };
      });
      const changed = next.find((t) => t.id === id);
      if (changed && remote && supabase) {
        supabase
          .from('tasks')
          .update({ status: changed.status })
          .eq('id', id)
          .then(({ error: err }) => {
            if (err) setError(`Saved locally — Supabase: ${err.message}`);
          });
      }
      return next;
    });
  }, [remote]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (remote && supabase) {
      supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .then(({ error: err }) => {
          if (err) setError(`Deleted locally — Supabase: ${err.message}`);
        });
    }
  }, [remote]);

  const refresh = useCallback(() => {
    if (remote) fetchRemote().catch(() => {});
  }, [remote, fetchRemote]);

  const setSessionStatus = useCallback((_taskId: string, _status: string) => {
    // Sessions live in plan screen state; kept for API parity with Flutter service.
  }, []);

  const value = useMemo<TasksState>(() => {
    const pending = tasks.filter((t) => t.status !== 'completed');
    const completed = tasks.filter((t) => t.status === 'completed');
    const urgent = [...pending].sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    );
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
