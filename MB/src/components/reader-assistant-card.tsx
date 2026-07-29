import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BookOpen, ChevronRight, MessageCircle, Send, Sparkles, Star, WandSparkles, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

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

function cleanAssistantMarkdown(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function ReaderAssistantCard({ home, onContinue, onOpenSeries }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const messagesRef = useRef<ScrollView>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: home.assistant.greeting },
  ]);
  const currentRead = home.continueReading[0];
  const spotlightPulse = useRef(new Animated.Value(0)).current;
  const quickPrompts = useMemo(
    () => [
      currentRead ? t('assistantReader.continuePrompt') : t('assistantReader.recommendPrompt'),
      t('assistantReader.todayPrompt'),
    ],
    [currentRead, t]
  );

  useEffect(() => {
    if (!chatVisible) return;
    const frame = requestAnimationFrame(() => messagesRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [chatVisible, messages, sending]);

  useEffect(() => {
    if (!currentRead) return;
    spotlightPulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spotlightPulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(spotlightPulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [currentRead, spotlightPulse]);

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
        { role: 'assistant', content: error?.message || t('assistantReader.error') },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <View
        style={styles.card}
      >
        <View style={styles.characterHeader}>
          <View style={styles.characterCluster}>
            <Image source={require('@/assets/miko-chibi.png')} style={styles.characterImage} contentFit="contain" />
            <View style={styles.characterSparkle}><Sparkles size={12} color="#f4dfa1" /></View>
          </View>
          <View style={styles.headingCopy}>
            <View style={styles.nameRow}>
              <ThemedText style={styles.name}>{home.assistant.name}</ThemedText>
              <ThemedText style={styles.waveText}>✦</ThemedText>
            </View>
            <ThemedText style={styles.label}>{t('assistantReader.companion')}</ThemedText>
          </View>
          <Pressable style={styles.miniChatButton} onPress={() => setChatVisible(true)}>
            <MessageCircle size={17} color="#f5dfd2" />
          </Pressable>
        </View>

        <View style={styles.speechBubble}>
          <View style={styles.speechTail} />
          <ThemedText style={styles.greeting}>{cleanAssistantMarkdown(home.assistant.greeting)}</ThemedText>
        </View>

        {currentRead && (
          <Animated.View
            style={[
              styles.continueSpotlight,
              {
                transform: [{ scale: spotlightPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) }],
              },
            ]}
          >
            <Pressable style={styles.continuePressable} onPress={() => onContinue(currentRead)}>
              {getImageUrl(currentRead.coverImage) ? (
                <Image
                  source={{ uri: getImageUrl(currentRead.coverImage) }}
                  style={styles.continueCover}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.continueCover, styles.coverPlaceholder]}>
                  <BookOpen size={22} color="#9ca197" />
                </View>
              )}
              <View style={styles.continueBody}>
                <ThemedText style={styles.continueEyebrow}>{t('assistantReader.continue')}</ThemedText>
                <ThemedText style={styles.continueTitle} numberOfLines={1}>{currentRead.title}</ThemedText>
              <ThemedText style={styles.continueChapter} numberOfLines={1}>
                  {t('readerHome.chapter', { count: currentRead.chapterNumber })} • {Math.round(currentRead.percentage)}%
                </ThemedText>
                <View style={styles.continueProgressTrack}>
                  <View style={[styles.continueProgressFill, { width: `${Math.max(3, currentRead.percentage)}%` }]} />
                </View>
              </View>
              <View style={styles.continueArrow}><ChevronRight size={17} color="#fffaf0" /></View>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.bubbleActions}>
          {currentRead ? (
            <Pressable style={styles.actionBubble} onPress={() => onContinue(currentRead)}>
              <BookOpen size={14} color="#f5dfd2" />
              <ThemedText style={styles.actionBubbleText}>{t('assistantReader.continueAction')}</ThemedText>
            </Pressable>
          ) : home.recommendations[0] ? (
            <Pressable style={styles.actionBubble} onPress={() => onOpenSeries(home.recommendations[0])}>
              <Sparkles size={14} color="#f4dfa1" />
              <ThemedText style={styles.actionBubbleText}>{t('assistantReader.recommendAction')}</ThemedText>
            </Pressable>
          ) : null}
          <Pressable style={styles.actionBubbleSoft} onPress={() => setChatVisible(true)}>
            <ThemedText style={styles.actionBubbleSoftText}>{t('assistantReader.chatAction', { name: home.assistant.name })}</ThemedText>
            <ChevronRight size={14} color="#dc957d" />
          </Pressable>
        </View>
      </View>

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
          <BlurView
            intensity={44}
            tint="default"
            pointerEvents="none"
            style={styles.chatBackdropBlur}
          />
          <View style={styles.chatSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.chatHeader}>
              <View style={styles.headingRow}>
                <View style={styles.smallAvatar}>
                  <Image source={require('@/assets/miko-chibi.png')} style={styles.smallAvatarImage} contentFit="contain" />
                  <View style={styles.onlineDot} />
                </View>
                <View>
                  <View style={styles.nameRow}>
                  <ThemedText style={styles.chatTitle}>{home.assistant.name}</ThemedText>
                    <Sparkles size={12} color="#dc957d" />
                  </View>
                  <ThemedText style={styles.chatStatus}>{t('assistantReader.status')}</ThemedText>
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setChatVisible(false)} hitSlop={8}>
                <X size={19} color="#c9c8b8" />
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
                <ThemedText style={styles.conversationLabelText}>{t('assistantReader.today')}</ThemedText>
                <View style={styles.conversationLine} />
              </View>

              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <View key={`${message.role}-${index}`} style={styles.messageGroup}>
                    <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
                      {!isUser && (
                        <View style={styles.messageAvatar}><Image source={require('@/assets/miko-chibi.png')} style={styles.messageAvatarImage} contentFit="contain" /></View>
                      )}
                      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                        <ThemedText style={styles.bubbleText}>
                          {message.role === 'assistant' ? cleanAssistantMarkdown(message.content) : message.content}
                        </ThemedText>
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
                            {getImageUrl(series.coverImage) ? (
                              <Image
                                source={{ uri: getImageUrl(series.coverImage) }}
                                style={styles.seriesResultCover}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={[styles.seriesResultCover, styles.coverPlaceholder]}>
                                <BookOpen size={20} color="#9ca197" />
                              </View>
                            )}
                            <View style={styles.seriesResultBody}>
                              <ThemedText style={styles.seriesResultTitle} numberOfLines={2}>{series.title}</ThemedText>
                              <ThemedText style={styles.seriesResultGenre} numberOfLines={1}>
                                {(Array.isArray(series.genre) ? series.genre : []).slice(0, 2).join(' • ') || t('assistantReader.genericGenre')}
                              </ThemedText>
                              <View style={styles.seriesResultMeta}>
                                <View style={styles.ratingRow}>
                                  <Star size={11} color="#c6942d" fill="#c6942d" />
                                  <ThemedText style={styles.ratingText}>
                            {series.averageRating > 0 ? series.averageRating.toFixed(1) : t('assistantReader.newSeries')}
                                  </ThemedText>
                                </View>
                                <View style={styles.openSeriesAction}>
                                  <ThemedText style={styles.openSeriesText}>{t('assistantReader.viewSeries')}</ThemedText>
                                  <ChevronRight size={13} color="#dc957d" />
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
                  <View style={styles.messageAvatar}><Image source={require('@/assets/miko-chibi.png')} style={styles.messageAvatarImage} contentFit="contain" /></View>
                  <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
                    <ActivityIndicator color="#a88a6b" size="small" />
                    <ThemedText style={styles.typingText}>{t('assistantReader.thinking', { name: home.assistant.name })}</ThemedText>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.promptSection}>
              <View style={styles.promptHeading}>
                <WandSparkles size={12} color="#a88a6b" />
                <ThemedText style={styles.promptHeadingText}>{t('assistantReader.quickSuggestions')}</ThemedText>
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
                  placeholder={t('assistantReader.placeholder', { name: home.assistant.name })}
                  placeholderTextColor="#786f68"
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
                  <View style={styles.sendButtonInner}>
                    <Send size={18} color="#fffaf0" />
                  </View>
                </Pressable>
              </View>
              <ThemedText style={styles.disclaimer}>{t('assistantReader.disclaimer', { name: home.assistant.name })}</ThemedText>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 26, padding: 16, gap: 13, borderWidth: 1, borderColor: 'rgba(220,149,125,0.24)', backgroundColor: '#273431', shadowColor: '#7a5a43', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  characterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  characterCluster: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  characterImage: { width: 76, height: 76, position: 'absolute', bottom: -4 },
  characterSparkle: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,87,69,0.28)' },
  waveText: { color: '#dc957d', fontSize: 15, fontWeight: '900' },
  miniChatButton: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(39,52,49,0.38)', borderWidth: 1, borderColor: 'rgba(255,250,240,0.24)' },
  speechBubble: { position: 'relative', borderRadius: 19, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(39,52,49,0.38)', borderWidth: 1, borderColor: 'rgba(255,250,240,0.24)' },
  speechTail: { position: 'absolute', top: -6, left: 27, width: 12, height: 12, transform: [{ rotate: '45deg' }], backgroundColor: '#6b4d3a', borderLeftWidth: 1, borderTopWidth: 1, borderColor: 'rgba(255,250,240,0.24)' },
  continueSpotlight: { borderRadius: 18, backgroundColor: '#273431', borderWidth: 1, borderColor: 'rgba(255,250,240,0.28)', shadowColor: '#dc957d', shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  continuePressable: { minHeight: 78, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden', borderRadius: 17 },
  continueCover: { width: 58, height: 78, backgroundColor: '#35433e' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  continueBody: { flex: 1, justifyContent: 'center', gap: 3, paddingHorizontal: 11, paddingVertical: 9 },
  continueEyebrow: { color: '#dc957d', fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 1 },
  continueTitle: { color: '#fffaf0', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  continueChapter: { color: '#eadcc9', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  continueProgressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4, backgroundColor: 'rgba(255,250,240,0.18)' },
  continueProgressFill: { height: '100%', borderRadius: 2, backgroundColor: '#c85745' },
  continueArrow: { width: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(185,66,52,0.32)' },
  bubbleActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#b94234', borderWidth: 1, borderColor: 'rgba(255,250,240,0.15)' },
  actionBubbleText: { color: '#fffaf0', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  actionBubbleSoft: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(39,52,49,0.42)', borderWidth: 1, borderColor: 'rgba(255,250,240,0.22)' },
  actionBubbleSoftText: { color: '#f5dfd2', fontSize: 11, lineHeight: 15, fontWeight: '800' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6b4d3a' },
  smallAvatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'visible', backgroundColor: '#273431' },
  smallAvatarImage: { width: 61, height: 61, position: 'absolute', bottom: -2 },
  onlineDot: { position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#357053', borderWidth: 2, borderColor: '#1c2928' },
  headingCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: '#fffaf0', fontSize: 16, fontWeight: '900' },
  label: { color: '#d7cbb0', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { color: '#f6efdf', fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, backgroundColor: '#b94234', paddingHorizontal: 16, paddingVertical: 10 },
  primaryButtonText: { color: '#fffaf0', fontSize: 12, fontWeight: '900' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, backgroundColor: 'rgba(255,250,240,0.08)', paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,250,240,0.1)' },
  secondaryButtonText: { color: '#eadcc9', fontSize: 12, fontWeight: '900' },
  recommendation: { backgroundColor: 'rgba(28,41,40,0.35)', borderRadius: 14, padding: 11 },
  recommendationLabel: { color: '#dc957d', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  recommendationTitle: { color: '#fffaf0', fontSize: 13, fontWeight: '800', marginTop: 3 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,41,40,0.2)' },
  chatBackdropBlur: { ...StyleSheet.absoluteFillObject },
  chatSheet: { height: '94%', backgroundColor: 'rgba(39,52,49,0.78)', overflow: 'visible' },
  dragHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(201,200,184,0.28)', alignSelf: 'center', marginTop: 9, marginBottom: 3 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(220,149,125,0.32)', backgroundColor: 'rgba(39,52,49,0.9)' },
  chatTitle: { color: '#fffaf0', fontSize: 17, lineHeight: 21, fontWeight: '900' },
  chatStatus: { color: '#a88a6b', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  closeButton: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,240,0.06)', borderWidth: 1, borderColor: 'rgba(255,250,240,0.06)' },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 12 },
  conversationLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  conversationLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,250,240,0.06)' },
  conversationLabelText: { color: '#706858', fontSize: 9, lineHeight: 12, fontWeight: '800', letterSpacing: 1.2 },
  messageGroup: { alignSelf: 'stretch', gap: 9 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: 'stretch' },
  userMessageRow: { justifyContent: 'flex-end' },
  messageAvatar: { width: 27, height: 27, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#273431', borderWidth: 1, borderColor: 'rgba(168,138,107,0.2)' },
  messageAvatarImage: { width: 37, height: 37, position: 'absolute', bottom: -2 },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1 },
  assistantBubble: { backgroundColor: '#35433e', borderColor: 'rgba(215,203,176,0.28)', borderBottomLeftRadius: 6 },
  userBubble: { backgroundColor: '#b94234', borderColor: 'rgba(255,250,240,0.12)', borderBottomRightRadius: 6 },
  bubbleText: { color: '#f6efdf', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  typingText: { color: '#a88a6b', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  seriesResults: { marginLeft: 35, gap: 8 },
  seriesResultCard: { minHeight: 86, flexDirection: 'row', overflow: 'hidden', borderRadius: 16, backgroundColor: '#273431', borderWidth: 1, borderColor: 'rgba(215,203,176,0.24)' },
  seriesResultCardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  seriesResultCover: { width: 66, minHeight: 86, backgroundColor: '#273431' },
  seriesResultBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 9, justifyContent: 'space-between', gap: 3 },
  seriesResultTitle: { color: '#fffaf0', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  seriesResultGenre: { color: '#a88a6b', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  seriesResultMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#e4c66f', fontSize: 10, lineHeight: 13, fontWeight: '800' },
  openSeriesAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openSeriesText: { color: '#dc957d', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  promptSection: { flexShrink: 0, paddingTop: 10, paddingBottom: 9, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,250,240,0.14)', backgroundColor: 'rgba(39,52,49,0.86)' },
  promptHeading: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, marginBottom: 8 },
  promptHeadingText: { color: '#938775', fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 1.1 },
  promptScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 38 },
  prompts: { gap: 8, paddingHorizontal: 16, alignItems: 'center' },
  promptChip: { height: 34, maxWidth: 260, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#35433e', borderWidth: 1, borderColor: 'rgba(215,203,176,0.28)' },
  promptText: { color: '#dfd5c1', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  composerArea: { flexShrink: 0, paddingTop: 11, paddingHorizontal: 14, backgroundColor: 'rgba(39,52,49,0.92)', borderTopWidth: 1, borderTopColor: 'rgba(255,250,240,0.14)' },
  composer: { minHeight: 50, flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 5, paddingLeft: 14, borderRadius: 18, backgroundColor: '#35433e', borderWidth: 1, borderColor: 'rgba(225,216,193,0.2)' },
  input: { flex: 1, minHeight: 39, maxHeight: 96, color: '#f6efdf', paddingTop: 9, paddingBottom: 8, paddingHorizontal: 0, fontSize: 14, lineHeight: 20, textAlignVertical: 'center' },
  sendButton: { width: 40, height: 40, borderRadius: 14, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.38 },
  sendButtonInner: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b94234' },
  disclaimer: { color: '#6e685d', fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 7 },
});
