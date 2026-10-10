import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { enrichTask } from '@/lib/gemini';
import type { Task, TaskStatus } from '@/lib/types';

const SUBJECTS = ['Database Systems', 'Algorithms', 'Web Development', 'Computer Networks', 'Calculus', 'General'];

interface Props {
  initial?: Task;
  saving: boolean;
  onSave: (t: Task) => void;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function newTaskId(initialId?: string): string {
  if (initialId) return initialId;
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return `task-${c.randomUUID()}`;
  } catch { /* fall through */ }
  return `task-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Strict local YYYY-MM-DD + HH:MM → Date, or null. Rejects overflow like Feb 30. */
export function parseLocalDeadline(date: string, time: string): Date | null {
  const d = date.trim();
  const t = time.trim();
  if (!DATE_RE.test(d) || !TIME_RE.test(t)) return null;
  const [y, m, day] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  const parsed = new Date(y, m - 1, day, h, mi, 0, 0);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== h ||
    parsed.getMinutes() !== mi
  ) {
    return null;
  }
  return parsed;
}

/** AI ISO → local date/time fields. Date-only strings become local noon (never UTC-midnight shift). */
function splitISOToLocalFields(iso: string): { date: string; time: string } | null {
  const s = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { date: s, time: '12:00' };
  }
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function DzTaskForm({ initial, saving, onSave }: Props) {
  const [initDue] = useState(() =>
    initial ? new Date(initial.dueAt) : new Date(Date.now() + 26 * 3600000),
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? 'General');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(`${initDue.getFullYear()}-${pad(initDue.getMonth() + 1)}-${pad(initDue.getDate())}`);
  const [time, setTime] = useState(`${pad(initDue.getHours())}:${pad(initDue.getMinutes())}`);
  const [estimated, setEstimated] = useState(initial?.estimatedMinutes ?? 60);
  const [importance, setImportance] = useState(initial?.importance ?? 4);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3);
  const [error, setError] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const aiFill = async () => {
    if (!title.trim() || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const r = await enrichTask(title.trim());
      if (r.title) setTitle(r.title);
      setSubject(r.subject);
      if (r.description) setDescription(r.description);
      if (r.estimatedMinutes) setEstimated(r.estimatedMinutes);
      if (r.importance) setImportance(r.importance);
      if (r.difficulty) setDifficulty(r.difficulty);
      if (r.dueAtISO) {
        const fields = splitISOToLocalFields(r.dueAtISO);
        if (fields) {
          setDate(fields.date);
          setTime(fields.time);
        }
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI fill failed.');
    } finally {
      setAiBusy(false);
    }
  };

  const step = (v: number, d: number, min: number, max: number, set: (n: number) => void) => {
    set(Math.min(max, Math.max(min, v + d)));
  };

  const submit = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Please enter a title for the assignment');
      return;
    }
    if (cleanTitle.length > 140) {
      setError('Title is too long (max 140 characters)');
      return;
    }
    const cleanSubject = subject.trim() || 'General';
    if (cleanSubject.length > 80) {
      setError('Subject is too long (max 80 characters)');
      return;
    }
    const parsed = parseLocalDeadline(date, time);
    if (!parsed) {
      setError('Use a real date as YYYY-MM-DD and time as HH:MM (e.g. 2026-10-12, 14:00)');
      return;
    }
    const minutes = Math.min(360, Math.max(15, Math.round(estimated)));
    const imp = Math.min(5, Math.max(1, Math.round(importance)));
    const diff = Math.min(5, Math.max(1, Math.round(difficulty)));
    setError('');
    onSave({
      id: newTaskId(initial?.id),
      userId: initial?.userId ?? '',
      title: cleanTitle,
      subject: cleanSubject,
      description: description.trim() ? description.trim().slice(0, 2000) : undefined,
      dueAt: parsed.toISOString(),
      estimatedMinutes: minutes,
      importance: imp,
      difficulty: diff,
      status: (initial?.status ?? 'pending') as TaskStatus,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.label}>Task Title</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Database Normalization Practice" style={styles.input} placeholderTextColor={DZ.secondaryText} />
      <View>
        <Pressable onPress={aiFill} disabled={aiBusy || !title.trim()} style={[styles.aiBtn, (aiBusy || !title.trim()) && styles.disabled]}>
          <Text style={styles.aiBtnTxt}>{aiBusy ? '✨ Thinking… (local AI)' : '✨ AI Fill from title'}</Text>
        </Pressable>
        {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}
      </View>

      <Text style={styles.label}>Subject / Course</Text>
      <TextInput value={subject} onChangeText={setSubject} placeholder="Course name or tag" style={styles.input} placeholderTextColor={DZ.secondaryText} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {SUBJECTS.map((s) => {
          const on = subject === s;
          return (
            <Pressable key={s} onPress={() => setSubject(s)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{s}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>Deadline (YYYY-MM-DD / HH:MM)</Text>
      <View style={styles.row}>
        <TextInput value={date} onChangeText={setDate} placeholder="2026-10-12" style={[styles.input, styles.flex]} placeholderTextColor={DZ.secondaryText} />
        <TextInput value={time} onChangeText={setTime} placeholder="14:00" style={[styles.input, styles.flex]} placeholderTextColor={DZ.secondaryText} />
      </View>

      <StepperRow label="Estimated Duration" value={`${estimated} min (${(estimated / 60).toFixed(1)} hrs)`} onMinus={() => step(estimated, -15, 15, 360, setEstimated)} onPlus={() => step(estimated, 15, 15, 360, setEstimated)} />
      <StepperRow label="Importance (Priority Weight)" value={`${importance} / 5`} onMinus={() => step(importance, -1, 1, 5, setImportance)} onPlus={() => step(importance, 1, 1, 5, setImportance)} />
      <StepperRow label="Difficulty (Cognitive Effort)" value={`${difficulty} / 5`} onMinus={() => step(difficulty, -1, 1, 5, setDifficulty)} onPlus={() => step(difficulty, 1, 1, 5, setDifficulty)} />

      <Text style={styles.label}>Notes & Details (Optional)</Text>
      <TextInput value={description} onChangeText={setDescription} multiline numberOfLines={3} placeholder="Guidelines, chapters, submission instructions…" style={[styles.input, styles.multi]} placeholderTextColor={DZ.secondaryText} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable onPress={submit} disabled={saving} style={[styles.save, saving && styles.disabled]}>
        <Text style={styles.saveTxt}>{saving ? 'Saving…' : initial ? 'Update Assignment' : 'Add Assignment'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function StepperRow({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.stepTop}>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={styles.stepValue}>{value}</Text>
      </View>
      <View style={styles.stepRow}>
        <Pressable onPress={onMinus} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>−</Text></Pressable>
        <Pressable onPress={onPlus} style={styles.stepBtn}><Text style={styles.stepBtnTxt}>+</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: DZ.mainBackground },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontWeight: '600', fontSize: 14, color: DZ.mainText, marginTop: 18, marginBottom: 6 },
  input: { backgroundColor: DZ.cardSurface, borderWidth: 1, borderColor: DZ.borders, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: DZ.mainText },
  flex: { flex: 1 },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  chips: { marginTop: 10 },
  chip: { backgroundColor: DZ.sidebarBackground, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  chipOn: { backgroundColor: DZ.softAccent, borderWidth: 1, borderColor: DZ.primary },
  chipTxt: { fontSize: 12, color: DZ.secondaryText },
  chipTxtOn: { color: DZ.primary, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  stepWrap: { marginTop: 18 },
  stepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: { fontWeight: '600', fontSize: 14, color: DZ.mainText, flex: 1 },
  stepValue: { fontWeight: '700', color: DZ.primary, fontSize: 13 },
  stepRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  stepBtn: { flex: 1, borderWidth: 1, borderColor: DZ.primary, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: DZ.cardSurface },
  stepBtnTxt: { color: DZ.primary, fontWeight: '800', fontSize: 18 },
  error: { color: DZ.errorText, marginTop: 12, fontSize: 13, fontWeight: '600' },
  aiBtn: { marginTop: 8, borderWidth: 1, borderColor: DZ.primary, backgroundColor: DZ.softAccent, borderRadius: 10, padding: 10, alignItems: 'center' },
  aiBtnTxt: { color: DZ.primary, fontWeight: '700', fontSize: 13 },
  aiError: { color: DZ.errorText, marginTop: 6, fontSize: 12 },
  save: { backgroundColor: DZ.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
