import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DZ } from '@/constants/deadline';
import { DzCard } from '@/components/dz-card';
import { buildStudyContext, isGeminiConfigured, sendChatMessage, type ChatMessage } from '@/lib/gemini';
import { useTasks } from '@/store/tasks';

const GREETING: ChatMessage = {
  role: 'model',
  text: "Hi, I'm your DeadlineZero study coach! Ask me about your workload, how to tackle an assignment, or how to plan your day.",
};

export default function AiChatScreen() {
  const { tasks } = useTasks();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const reply = await sendChatMessage(next, buildStudyContext(tasks, []));
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      setMessages((prev) => [...prev, { role: 'model', text: `Sorry — ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  if (!isGeminiConfigured) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.setupWrap}>
          <DzCard>
            <Text style={styles.setupTitle}>AI coach is not set up yet</Text>
            <Text style={styles.setupTxt}>
              Add your Google AI Studio key to hackathon-mobile/.env as EXPO_PUBLIC_GEMINI_API_KEY, then restart Expo.
            </Text>
          </DzCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => `msg-${i}`}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.row, item.role === 'user' ? styles.rowRight : styles.rowLeft]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.modelBubble]}>
                <Text style={[styles.msgTxt, item.role === 'user' ? styles.userTxt : styles.modelTxt]}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
        />
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your studies…"
            placeholderTextColor={DZ.secondaryText}
            style={styles.input}
            multiline
            editable={!busy}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} disabled={busy || !input.trim()} style={[styles.send, (busy || !input.trim()) && styles.disabled]}>
            <Text style={styles.sendTxt}>{busy ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DZ.mainBackground },
  flex: { flex: 1 },
  setupWrap: { flex: 1, padding: 20, justifyContent: 'center' },
  setupTitle: { fontSize: 16, fontWeight: '700', color: DZ.mainText },
  setupTxt: { fontSize: 13, color: DZ.secondaryText, marginTop: 8, lineHeight: 19 },
  list: { padding: 16, paddingBottom: 8, gap: 10 },
  row: { flexDirection: 'row' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 },
  userBubble: { backgroundColor: DZ.primary, borderBottomRightRadius: 4 },
  modelBubble: { backgroundColor: DZ.cardSurface, borderWidth: 1, borderColor: DZ.borders, borderBottomLeftRadius: 4 },
  msgTxt: { fontSize: 14, lineHeight: 20 },
  userTxt: { color: '#fff' },
  modelTxt: { color: DZ.mainText },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: DZ.borders, backgroundColor: DZ.cardSurface },
  input: { flex: 1, backgroundColor: DZ.mainBackground, borderWidth: 1, borderColor: DZ.borders, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: DZ.mainText, maxHeight: 110 },
  send: { backgroundColor: DZ.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  sendTxt: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
