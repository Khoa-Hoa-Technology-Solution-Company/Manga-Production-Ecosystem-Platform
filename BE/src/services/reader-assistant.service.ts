import { env } from '../config/env';

type AssistantSeries = {
  id: string;
  title: string;
  description?: string;
  genre: string[];
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AssistantContext = {
  displayName: string;
  currentReads: Array<AssistantSeries & { chapterNumber?: number; percentage?: number }>;
  recommendations: AssistantSeries[];
  history?: ChatMessage[];
};

function fallbackReply(message: string, context: AssistantContext): string {
  const normalized = message.toLocaleLowerCase('vi-VN');
  const current = context.currentReads[0];
  const suggestion = context.recommendations[0];

  if (/đọc tiếp|dang đọc|đang đọc|dở|tiếp tục/.test(normalized) && current) {
    return `Bạn đang đọc dở “${current.title}”${current.chapterNumber ? ` ở chương ${current.chapterNumber}` : ''}. Mình đã để nút đọc tiếp ngay bên dưới nhé.`;
  }

  if (/gợi ý|đề xuất|truyện mới|nên đọc|recommend/.test(normalized) && suggestion) {
    const genre = suggestion.genre[0] ? ` thuộc thể loại ${suggestion.genre[0]}` : '';
    return `Bạn có thể thử “${suggestion.title}”${genre}. Mình chọn bộ này dựa trên lịch sử đọc và các truyện đang nổi bật.`;
  }

  if (/tóm tắt|nhân vật|tình tiết|spoiler/.test(normalized)) {
    return 'Hiện MangaFlow chưa lưu nội dung văn bản của từng trang, nên mình chưa thể tóm tắt chính xác. Mình vẫn có thể giúp bạn chọn truyện hoặc mở lại phần đang đọc dở.';
  }

  return suggestion
    ? `Mình có thể giúp bạn đọc tiếp truyện đang dở hoặc tìm truyện phù hợp. Hôm nay bạn có thể thử “${suggestion.title}”.`
    : 'Mình có thể giúp bạn tìm truyện mới và mở lại phần đang đọc dở. Hãy cho mình biết thể loại bạn đang muốn đọc nhé.';
}

function extractResponseText(data: any): string | null {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim() || null;
  if (Array.isArray(content)) {
    const text = content
      .map((part: any) => part?.text)
      .filter((value: unknown): value is string => typeof value === 'string')
      .join('')
      .trim();
    return text || null;
  }
  return null;
}

export async function createReaderAssistantReply(
  message: string,
  context: AssistantContext
): Promise<{ reply: string; source: 'ai' | 'fallback' }> {
  if (!env.LLM_API_KEY) {
    return { reply: fallbackReply(message, context), source: 'fallback' };
  }

  const catalogContext = JSON.stringify({
    currentReads: context.currentReads,
    recommendations: context.recommendations,
  });
  const recentHistory = (context.history || [])
    .slice(-6)
    .map((item) => `${item.role}: ${item.content.slice(0, 500)}`)
    .join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const baseUrl = env.LLM_BASE_URL.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: env.LLM_MODEL,
          messages: [
            {
              role: 'system',
              content: [
                'Bạn là Miko, trợ lý đọc truyện của MangaFlow.',
                'Luôn trả lời bằng tiếng Việt, thân thiện, tối đa 120 từ.',
                'Chỉ gợi ý truyện có trong dữ liệu được cung cấp và không tự tạo tên truyện, ID hay tình tiết.',
                'Không tiết lộ nội dung sau vị trí người dùng đã đọc.',
                'Nếu không có đủ nội dung để tóm tắt hoặc giải thích, nói rõ giới hạn đó.',
                `Tên người dùng: ${context.displayName}.`,
                `Dữ liệu MangaFlow: ${catalogContext}`,
              ].join('\n'),
            },
            ...(context.history || []).slice(-6).map((item) => ({
              role: item.role,
              content: item.content.slice(0, 500),
            })),
            {
              role: 'user',
              content: message,
            },
          ],
          max_tokens: 350,
          temperature: 0.4,
        }),
      });

    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = extractResponseText(data);
    if (!reply) throw new Error('LLM returned an empty response');

    return { reply, source: 'ai' };
  } catch (error) {
    console.error('LLM reader assistant fallback:', error);
    return { reply: fallbackReply(message, context), source: 'fallback' };
  } finally {
    clearTimeout(timeout);
  }
}
