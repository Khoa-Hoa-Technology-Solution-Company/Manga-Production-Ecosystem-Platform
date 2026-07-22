import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Bot, BookOpen, MessageCircle, Send, Sparkles, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { readerAPI, type ContinueReadingItem, type ReaderHome, type ReaderSeries } from '@/lib/api';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type Props = {
  home: ReaderHome;
  onContinue: (item: ContinueReadingItem) => void;
  onOpenSeries: (item: ReaderSeries) => void;
};

export function ReaderAssistantCard({ home, onContinue, onOpenSeries }: Props) {
  const [chatVisible, setChatVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: home.assistant.greeting },
  ]);
  const currentRead = home.continueReading[0];
  const quickPrompts = useMemo(
    () => [
      currentRead ? 'Mở truyện tôi đang đọc dở' : 'Gợi ý truyện mới cho tôi',
      'Tôi nên đọc truyện nào hôm nay?',
    ],
    [currentRead]
  );

  const sendMessage = async (value?: string) => {
    const content = (value ?? draft).trim();
    if (!content || sending) return;
    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);
    try {
      const data = await readerAPI.chat(content, nextMessages.slice(-6));
      setMessages((previous) => [...previous, { role: 'assistant', content: data.reply }]);
    } catch (error: any) {
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: error?.message || 'Mình chưa thể trả lời lúc này. Bạn thử lại sau nhé.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <LinearGradient
        colors={['rgba(124,58,237,0.28)', 'rgba(244,63,94,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.headingRow}>
          <View style={styles.avatar}><Bot size={22} color="#fff" /></View>
          <View style={styles.headingCopy}>
            <View style={styles.nameRow}>
              <ThemedText style={styles.name}>{home.assistant.name}</ThemedText>
              <Sparkles size={13} color="#fda4af" />
            </View>
            <ThemedText style={styles.label}>TRỢ LÝ ĐỌC TRUYỆN</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.greeting}>{home.assistant.greeting}</ThemedText>
        <View style={styles.actions}>
          {currentRead && (
            <Pressable style={styles.primaryButton} onPress={() => onContinue(currentRead)}>
              <BookOpen size={15} color="#fff" />
              <ThemedText style={styles.primaryButtonText}>Đọc tiếp</ThemedText>
            </Pressable>
          )}
          <Pressable style={styles.secondaryButton} onPress={() => setChatVisible(true)}>
            <MessageCircle size={15} color="#e9d5ff" />
            <ThemedText style={styles.secondaryButtonText}>Hỏi Miko</ThemedText>
          </Pressable>
        </View>

        {!currentRead && home.recommendations[0] && (
          <Pressable style={styles.recommendation} onPress={() => onOpenSeries(home.recommendations[0])}>
            <ThemedText style={styles.recommendationLabel}>GỢI Ý CHO BẠN</ThemedText>
            <ThemedText style={styles.recommendationTitle} numberOfLines={1}>{home.recommendations[0].title}</ThemedText>
          </Pressable>
        )}
      </LinearGradient>

      <Modal visible={chatVisible} animationType="slide" transparent onRequestClose={() => setChatVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.chatSheet}>
            <View style={styles.chatHeader}>
              <View style={styles.headingRow}>
                <View style={styles.smallAvatar}><Bot size={18} color="#fff" /></View>
                <View>
                  <ThemedText style={styles.chatTitle}>Miko</ThemedText>
                  <ThemedText style={styles.chatStatus}>Trợ lý MangaFlow</ThemedText>
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setChatVisible(false)}><X size={20} color="#cbd5e1" /></Pressable>
            </View>

            <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
              {messages.map((message, index) => (
                <View key={`${message.role}-${index}`} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  <ThemedText style={styles.bubbleText}>{message.content}</ThemedText>
                </View>
              ))}
              {sending && <ActivityIndicator color="#f43f5e" style={styles.loading} />}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prompts}>
              {quickPrompts.map((prompt) => (
                <Pressable key={prompt} style={styles.promptChip} onPress={() => sendMessage(prompt)}>
                  <ThemedText style={styles.promptText}>{prompt}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.composer}>
              <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => sendMessage()} placeholder="Hỏi Miko về truyện..." placeholderTextColor="#64748b" style={styles.input} maxLength={1000} returnKeyType="send" />
              <Pressable style={styles.sendButton} onPress={() => sendMessage()} disabled={sending || !draft.trim()}><Send size={18} color="#fff" /></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(216,180,254,0.2)' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  smallAvatar: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  headingCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: '#fff', fontSize: 16, fontWeight: '900' },
  label: { color: '#c4b5fd', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { color: '#f8fafc', fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, backgroundColor: '#f43f5e', paddingHorizontal: 16, paddingVertical: 10 },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  secondaryButtonText: { color: '#e9d5ff', fontSize: 12, fontWeight: '900' },
  recommendation: { backgroundColor: 'rgba(7,2,13,0.35)', borderRadius: 14, padding: 11 },
  recommendationLabel: { color: '#fda4af', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  recommendationTitle: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 3 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  chatSheet: { height: '82%', backgroundColor: '#0f0a1d', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  chatTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  chatStatus: { color: '#a78bfa', fontSize: 10, fontWeight: '700' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#22183a', borderBottomLeftRadius: 5 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#e11d48', borderBottomRightRadius: 5 },
  bubbleText: { color: '#f8fafc', fontSize: 13, lineHeight: 19 },
  loading: { alignSelf: 'flex-start', margin: 8 },
  prompts: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  promptChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(124,58,237,0.16)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  promptText: { color: '#ddd6fe', fontSize: 11, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  input: { flex: 1, minHeight: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', color: '#fff', paddingHorizontal: 14, fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f43f5e' },
});
