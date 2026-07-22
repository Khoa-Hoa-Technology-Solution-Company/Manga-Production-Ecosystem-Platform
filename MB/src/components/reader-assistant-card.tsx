import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Bot, BookOpen, ChevronRight, MessageCircle, Send, Sparkles, Star, WandSparkles, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getImageUrl, readerAPI, type ContinueReadingItem, type ReaderHome, type ReaderSeries } from '@/lib/api';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: ReaderSeries[];
};

type Props = {
  home: ReaderHome;
  onContinue: (item: ContinueReadingItem) => void;
  onOpenSeries: (item: ReaderSeries) => void;
};

export function ReaderAssistantCard({ home, onContinue, onOpenSeries }: Props) {
  const insets = useSafeAreaInsets();
  const messagesRef = useRef<ScrollView>(null);
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

  useEffect(() => {
    if (!chatVisible) return;
    const frame = requestAnimationFrame(() => messagesRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [chatVisible, messages, sending]);

  const sendMessage = async (value?: string) => {
    const content = (value ?? draft).trim();
    if (!content || sending) return;
    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);
    try {
      const data = await readerAPI.chat(content, nextMessages.slice(-6));
      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: data.reply, recommendations: data.recommendations },
      ]);
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

      <Modal
        visible={chatVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setChatVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.chatHeader}>
              <View style={styles.headingRow}>
                <LinearGradient colors={['#8b5cf6', '#6d28d9']} style={styles.smallAvatar}>
                  <Bot size={19} color="#fff" />
                  <View style={styles.onlineDot} />
                </LinearGradient>
                <View>
                  <View style={styles.nameRow}>
                    <ThemedText style={styles.chatTitle}>Miko</ThemedText>
                    <Sparkles size={12} color="#fda4af" />
                  </View>
                  <ThemedText style={styles.chatStatus}>Trợ lý đọc truyện • Đang hoạt động</ThemedText>
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setChatVisible(false)} hitSlop={8}>
                <X size={19} color="#cbd5e1" />
              </Pressable>
            </View>

            <ScrollView
              ref={messagesRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.conversationLabel}>
                <View style={styles.conversationLine} />
                <ThemedText style={styles.conversationLabelText}>HÔM NAY</ThemedText>
                <View style={styles.conversationLine} />
              </View>

              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <View key={`${message.role}-${index}`} style={styles.messageGroup}>
                    <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
                      {!isUser && (
                        <View style={styles.messageAvatar}>
                          <Bot size={13} color="#c4b5fd" />
                        </View>
                      )}
                      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                        <ThemedText style={styles.bubbleText}>{message.content}</ThemedText>
                      </View>
                    </View>

                    {!isUser && message.recommendations && message.recommendations.length > 0 && (
                      <View style={styles.seriesResults}>
                        {message.recommendations.map((series) => (
                          <Pressable
                            key={series.id}
                            style={({ pressed }) => [styles.seriesResultCard, pressed && styles.seriesResultCardPressed]}
                            onPress={() => onOpenSeries(series)}
                          >
                            <Image
                              source={{ uri: getImageUrl(series.coverImage) || `https://picsum.photos/seed/${series.id}/160/220` }}
                              style={styles.seriesResultCover}
                              contentFit="cover"
                            />
                            <View style={styles.seriesResultBody}>
                              <ThemedText style={styles.seriesResultTitle} numberOfLines={2}>{series.title}</ThemedText>
                              <ThemedText style={styles.seriesResultGenre} numberOfLines={1}>
                                {(series.genre || []).slice(0, 2).join(' • ') || 'Manga'}
                              </ThemedText>
                              <View style={styles.seriesResultMeta}>
                                <View style={styles.ratingRow}>
                                  <Star size={11} color="#fbbf24" fill="#fbbf24" />
                                  <ThemedText style={styles.ratingText}>
                                    {series.averageRating > 0 ? series.averageRating.toFixed(1) : 'Mới'}
                                  </ThemedText>
                                </View>
                                <View style={styles.openSeriesAction}>
                                  <ThemedText style={styles.openSeriesText}>Xem truyện</ThemedText>
                                  <ChevronRight size={13} color="#fda4af" />
                                </View>
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {sending && (
                <View style={styles.messageRow}>
                  <View style={styles.messageAvatar}><Bot size={13} color="#c4b5fd" /></View>
                  <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
                    <ActivityIndicator color="#a78bfa" size="small" />
                    <ThemedText style={styles.typingText}>Miko đang suy nghĩ…</ThemedText>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.promptSection}>
              <View style={styles.promptHeading}>
                <WandSparkles size={12} color="#a78bfa" />
                <ThemedText style={styles.promptHeadingText}>GỢI Ý NHANH</ThemedText>
              </View>
              <ScrollView
                horizontal
                style={styles.promptScroll}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.prompts}
                keyboardShouldPersistTaps="handled"
              >
                {quickPrompts.map((prompt) => (
                  <Pressable key={prompt} style={styles.promptChip} onPress={() => sendMessage(prompt)}>
                    <ThemedText style={styles.promptText} numberOfLines={1}>{prompt}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => sendMessage()}
                  placeholder="Nhắn Miko về truyện bạn thích…"
                  placeholderTextColor="#746b86"
                  style={styles.input}
                  maxLength={1000}
                  returnKeyType="send"
                  multiline
                  blurOnSubmit
                />
                <Pressable
                  style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={() => sendMessage()}
                  disabled={sending || !draft.trim()}
                >
                  <LinearGradient colors={['#fb7185', '#e11d48']} style={styles.sendGradient}>
                    <Send size={18} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>
              <ThemedText style={styles.disclaimer}>Miko có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</ThemedText>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(216,180,254,0.2)' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  smallAvatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#10091e' },
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
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,2,12,0.68)' },
  chatSheet: { height: '88%', backgroundColor: '#0b0616', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(196,181,253,0.14)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 28, shadowOffset: { width: 0, height: -10 }, elevation: 24 },
  dragHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(203,213,225,0.28)', alignSelf: 'center', marginTop: 9, marginBottom: 3 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', backgroundColor: '#10091e' },
  chatTitle: { color: '#fff', fontSize: 17, lineHeight: 21, fontWeight: '900' },
  chatStatus: { color: '#a78bfa', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  closeButton: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 12 },
  conversationLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  conversationLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  conversationLabelText: { color: '#625a73', fontSize: 9, lineHeight: 12, fontWeight: '800', letterSpacing: 1.2 },
  messageGroup: { alignSelf: 'stretch', gap: 9 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: 'stretch' },
  userMessageRow: { justifyContent: 'flex-end' },
  messageAvatar: { width: 27, height: 27, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1b1230', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  assistantBubble: { backgroundColor: '#1a112d', borderColor: 'rgba(167,139,250,0.13)', borderBottomLeftRadius: 6 },
  userBubble: { backgroundColor: '#e11d48', borderColor: 'rgba(255,255,255,0.12)', borderBottomRightRadius: 6 },
  bubbleText: { color: '#f8fafc', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  typingText: { color: '#a78bfa', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  seriesResults: { marginLeft: 35, gap: 8 },
  seriesResultCard: { minHeight: 86, flexDirection: 'row', overflow: 'hidden', borderRadius: 16, backgroundColor: '#140d24', borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)' },
  seriesResultCardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  seriesResultCover: { width: 66, minHeight: 86, backgroundColor: '#24193a' },
  seriesResultBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 9, justifyContent: 'space-between', gap: 3 },
  seriesResultTitle: { color: '#fff', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  seriesResultGenre: { color: '#a78bfa', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  seriesResultMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#fde68a', fontSize: 10, lineHeight: 13, fontWeight: '800' },
  openSeriesAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openSeriesText: { color: '#fda4af', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  promptSection: { flexShrink: 0, paddingTop: 10, paddingBottom: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0e081a' },
  promptHeading: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, marginBottom: 8 },
  promptHeadingText: { color: '#8f82a8', fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 1.1 },
  promptScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 38 },
  prompts: { gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  promptChip: { height: 34, maxWidth: 260, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#181027', borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)' },
  promptText: { color: '#d8cffa', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  composerArea: { flexShrink: 0, paddingTop: 11, paddingHorizontal: 14, backgroundColor: '#10091e', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  composer: { minHeight: 50, flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 5, paddingLeft: 14, borderRadius: 18, backgroundColor: '#191326', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  input: { flex: 1, minHeight: 39, maxHeight: 96, color: '#f8fafc', paddingTop: 9, paddingBottom: 8, paddingHorizontal: 0, fontSize: 14, lineHeight: 20, textAlignVertical: 'center' },
  sendButton: { width: 40, height: 40, borderRadius: 14, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.38 },
  sendGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: '#5f566f', fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 7 },
});
