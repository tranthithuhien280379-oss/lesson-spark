import { createServerFn } from "@tanstack/react-start";

export type Vocab = {
  word: string;
  definition: string;
  emoji: string;
  ipa: string;
  example: string;
};

export type MCQ = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type TrueFalse = {
  statement: string;
  answer: boolean;
  explanation: string;
};

export type MatchPair = { left: string; right: string };

export type FillBlank = {
  dialogue: string; // uses ___ for blank
  answer: string;
  hint: string;
};

export type Lesson = {
  title: string;
  level: "A1" | "A2" | "B1";
  summary: string;
  vocab: Vocab[];
  mcq: MCQ[];
  trueFalse: TrueFalse[];
  matching: MatchPair[];
  fillBlanks: FillBlank[];
};

const SYSTEM_PROMPT = `Bạn là chuyên gia thiết kế giáo trình tiếng Pháp (FLE) cho người Việt mới bắt đầu học tiếng Pháp. Dựa trên một chủ đề hoặc đoạn tài liệu, hãy tạo một bài học tiếng Pháp ngắn gọn, sinh động, trình độ A1–B1.

NGUYÊN TẮC NGÔN NGỮ (rất quan trọng):
- Nội dung tiếng Pháp cần học: từ vựng, câu ví dụ, câu hội thoại, phát biểu Đúng/Sai.
- MỌI hướng dẫn, giải thích, định nghĩa, gợi ý, tiêu đề câu hỏi đều viết bằng TIẾNG VIỆT đơn giản.

Chỉ trả về JSON hợp lệ (không markdown, không code fence, không giải thích thêm) đúng theo kiểu:

{
  "title": string,               // tiêu đề ngắn, hấp dẫn, bằng tiếng Việt (có thể kèm từ Pháp trong ngoặc)
  "level": "A1" | "A2" | "B1",
  "summary": string,             // 1-2 câu tiếng Việt mô tả bài học
  "vocab": Array<{ "word": string, "definition": string, "emoji": string, "ipa": string, "example": string }>, // 8 từ. word = từ/cụm tiếng Pháp (kèm mạo từ le/la nếu là danh từ); definition = nghĩa tiếng Việt; example = câu ví dụ tiếng Pháp
  "mcq": Array<{ "question": string, "options": string[], "answerIndex": number, "explanation": string }>, // 5 câu. question bằng tiếng Việt, options có thể là tiếng Pháp, explanation bằng tiếng Việt
  "trueFalse": Array<{ "statement": string, "answer": boolean, "explanation": string }>, // 5 câu. statement bằng tiếng Pháp, explanation bằng tiếng Việt
  "matching": Array<{ "left": string, "right": string }>, // 6 cặp: left = từ tiếng Pháp, right = nghĩa tiếng Việt
  "fillBlanks": Array<{ "dialogue": string, "answer": string, "hint": string }> // 5 câu. dialogue là câu tiếng Pháp có "___", answer là từ tiếng Pháp, hint bằng tiếng Việt
}

Quy tắc:
- Tiếng Pháp đơn giản, câu ngắn, đúng chính tả và dấu (é, è, ê, ç, à...).
- "emoji" là MỘT ký tự emoji minh họa từ đó.
- "ipa" là phiên âm IPA tiếng Pháp trong hai gạch chéo, ví dụ "/bɔ̃.ʒuʁ/".
- Mỗi câu MCQ phải có đúng 4 lựa chọn và answerIndex hợp lệ (0–3).
- fillBlanks.dialogue PHẢI chứa chuỗi "___" (ba dấu gạch dưới).
- Đa dạng độ khó, câu ngắn gọn.`;

const COACHIO_URL = "https://api.coachio.ai/api/v1/llm/chat/completions";
const COACHIO_MODEL = "google/gemini-3.1-flash-lite";

async function callCoachio(userContent: string, clientApiKey?: string): Promise<string> {
  const apiKey = clientApiKey?.trim() || process.env.COACHIO_API_KEY;
  if (!apiKey) throw new Error("Missing Coachio API key. Add one in Settings.");

  const res = await fetch(COACHIO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: COACHIO_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const safe = body.slice(0, 500);
    if (res.status === 401) throw new Error("Invalid Coachio API key");
    if (res.status === 402) throw new Error("Insufficient Coachio credits");
    if (res.status === 429) throw new Error("Rate limited. Please retry shortly.");
    throw new Error(`Coachio error ${res.status}: ${safe}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Coachio");
  return text;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

function normalize(raw: unknown): Lesson {
  const r = raw as Partial<Lesson>;
  const lesson: Lesson = {
    title: (r.title ?? "Your Lesson").toString().slice(0, 120),
    level: (r.level as Lesson["level"]) ?? "Elementary",
    summary: (r.summary ?? "").toString(),
    vocab: (r.vocab ?? []).slice(0, 12).map((v) => ({
      word: (v.word ?? "").toString(),
      definition: (v.definition ?? "").toString(),
      emoji: (v.emoji ?? "📘").toString().slice(0, 4),
      ipa: (v.ipa ?? "").toString(),
      example: (v.example ?? "").toString(),
    })),
    mcq: (r.mcq ?? []).slice(0, 8).map((q) => ({
      question: (q.question ?? "").toString(),
      options: (q.options ?? []).slice(0, 4).map(String),
      answerIndex: Math.max(0, Math.min(3, Number(q.answerIndex) || 0)),
      explanation: (q.explanation ?? "").toString(),
    })),
    trueFalse: (r.trueFalse ?? []).slice(0, 8).map((q) => ({
      statement: (q.statement ?? "").toString(),
      answer: Boolean(q.answer),
      explanation: (q.explanation ?? "").toString(),
    })),
    matching: (r.matching ?? []).slice(0, 8).map((p) => ({
      left: (p.left ?? "").toString(),
      right: (p.right ?? "").toString(),
    })),
    fillBlanks: (r.fillBlanks ?? []).slice(0, 8).map((f) => ({
      dialogue: (f.dialogue ?? "").toString(),
      answer: (f.answer ?? "").toString(),
      hint: (f.hint ?? "").toString(),
    })),
  };
  return lesson;
}

export const generateLesson = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = input as { source?: string; apiKey?: string };
    const source = (o?.source ?? "").toString().trim();
    if (!source) throw new Error("Please provide a topic or paste some content.");
    if (source.length > 20000) throw new Error("Content too long (max 20,000 chars).");
    return { source, apiKey: o?.apiKey };
  })
  .handler(async ({ data }) => {
    const userMsg = `Create a gamified ESL English lesson based on the following topic or source text. Derive the lesson title from it.\n\n---\n${data.source}\n---`;
    const text = await callCoachio(userMsg, data.apiKey);
    const parsed = extractJson(text);
    return normalize(parsed);
  });

export const testApiKey = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = input as { apiKey?: string };
    return { apiKey: o?.apiKey };
  })
  .handler(async ({ data }) => {
    const apiKey = data.apiKey?.trim() || process.env.COACHIO_API_KEY;
    if (!apiKey) return { ok: false as const, error: "No API key provided" };

    try {
      const res = await fetch(COACHIO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: COACHIO_MODEL,
          stream: false,
          temperature: 0,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (res.ok) return { ok: true as const };
      const text = await res.text().catch(() => "");
      return {
        ok: false as const,
        error: `Coachio responded ${res.status}`,
        detail: text.slice(0, 300),
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Network error" };
    }
  });
