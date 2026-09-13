import { useEffect, useMemo, useRef, useState } from "react";
import type { Lesson, Vocab, MCQ, TrueFalse, MatchPair, FillBlank } from "@/lib/lesson.functions";

type OnXp = (n: number) => void;

// ---------- French TTS ----------
// Mobile browsers often lack a fr-FR default voice and silently fall back to
// the system voice (e.g. Vietnamese). Explicitly pick a French voice.
let cachedFrVoice: SpeechSynthesisVoice | null | undefined;

function getFrenchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedFrVoice !== undefined) return cachedFrVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedFrVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith("fr")) ??
    voices.find((v) => /french|français/i.test(v.name)) ??
    null;
  return cachedFrVoice;
}

// Voices load asynchronously on many mobile browsers — refresh cache when ready.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedFrVoice = undefined;
    getFrenchVoice();
  };
}

export function speakFrench(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  const voice = getFrenchVoice();
  if (voice) u.voice = voice;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// ---------- Flashcards ----------
export function Flashcards({ items, onXp }: { items: Vocab[]; onXp: OnXp }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const card = items[i];
  if (!card) return null;

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const next = (learned: boolean) => {
    if (learned && !known.has(i)) {
      setKnown((s) => new Set(s).add(i));
      onXp(5);
    }
    setFlipped(false);
    setI((v) => (v + 1) % items.length);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted-foreground">
        Thẻ {i + 1} / {items.length} · Đã biết {known.size}
      </div>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full max-w-md min-h-[280px] rounded-3xl p-8 text-left shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-1 animate-pop"
        style={{ background: flipped ? "var(--gradient-mint)" : "var(--gradient-card)" }}
      >
        {!flipped ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="text-6xl">{card.emoji}</div>
            <div className="text-3xl font-bold">{card.word}</div>
            <div className="text-sm text-foreground/70">{card.ipa}</div>
            <div className="mt-2 text-xs text-foreground/60">Nhấn để xem nghĩa</div>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center gap-3">
            <div className="text-xs uppercase tracking-wider text-foreground/60">Nghĩa tiếng Việt</div>
            <div className="text-lg font-semibold">{card.definition}</div>
            <div className="mt-3 text-xs uppercase tracking-wider text-foreground/60">Ví dụ (tiếng Pháp)</div>
            <div className="italic">"{card.example}"</div>
          </div>
        )}
      </button>
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            speak(card.word);
          }}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] dark:bg-card"
        >
          🔊 Phát âm
        </button>
        <button
          onClick={() => next(false)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] dark:bg-card"
        >
          Bỏ qua
        </button>
        <button
          onClick={() => next(true)}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-pop)]"
        >
          Tôi đã biết ✓
        </button>
      </div>
    </div>
  );
}

// ---------- MCQ ----------
export function MCQGame({ items, onXp }: { items: MCQ[]; onXp: OnXp }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = items[i];
  if (!q) return null;

  const pick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === q.answerIndex) {
      setScore((s) => s + 1);
      onXp(10);
    }
  };
  const next = () => {
    if (i + 1 >= items.length) setDone(true);
    else {
      setI(i + 1);
      setPicked(null);
    }
  };

  if (done) return <Summary label="Trắc nghiệm" score={score} total={items.length} onReset={() => { setI(0); setPicked(null); setScore(0); setDone(false); }} />;

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] animate-float dark:bg-card">
      <div className="mb-2 text-xs text-muted-foreground">Câu {i + 1} / {items.length}</div>
      <h3 className="mb-4 text-lg font-bold">{q.question}</h3>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, idx) => {
          const isCorrect = picked !== null && idx === q.answerIndex;
          const isWrong = picked === idx && idx !== q.answerIndex;
          return (
            <button
              key={idx}
              onClick={() => pick(idx)}
              className={`rounded-2xl border-2 px-4 py-3 text-left font-medium transition-all ${
                isCorrect
                  ? "border-accent bg-accent/40"
                  : isWrong
                  ? "border-destructive bg-destructive/10 animate-shake"
                  : "border-border bg-muted hover:border-primary"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-4 rounded-2xl bg-muted p-3 text-sm animate-float">
          <div className="font-semibold">{picked === q.answerIndex ? "✅ Chính xác!" : "❌ Chưa đúng"}</div>
          <div className="mt-1 text-muted-foreground">{q.explanation}</div>
          <button onClick={next} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Tiếp →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- True/False ----------
export function TrueFalseGame({ items, onXp }: { items: TrueFalse[]; onXp: OnXp }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = items[i];
  if (!q) return null;
  const pick = (val: boolean) => {
    if (picked !== null) return;
    setPicked(val);
    if (val === q.answer) {
      setScore((s) => s + 1);
      onXp(8);
    }
  };
  const next = () => {
    if (i + 1 >= items.length) setDone(true);
    else { setI(i + 1); setPicked(null); }
  };
  if (done) return <Summary label="Đúng/Sai" score={score} total={items.length} onReset={() => { setI(0); setPicked(null); setScore(0); setDone(false); }} />;

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] animate-float dark:bg-card">
      <div className="mb-2 text-xs text-muted-foreground">{i + 1} / {items.length}</div>
      <div className="mb-6 rounded-2xl p-5 text-lg font-semibold" style={{ background: "var(--gradient-sun)" }}>
        {q.statement}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => pick(true)}
          disabled={picked !== null}
          className={`rounded-2xl py-4 text-lg font-bold shadow-[var(--shadow-soft)] transition ${
            picked === true ? (q.answer ? "bg-accent" : "bg-destructive/20 animate-shake") : "bg-[color:var(--pastel-mint)]"
          }`}
        >
          ✅ Đúng
        </button>
        <button
          onClick={() => pick(false)}
          disabled={picked !== null}
          className={`rounded-2xl py-4 text-lg font-bold shadow-[var(--shadow-soft)] transition ${
            picked === false ? (!q.answer ? "bg-accent" : "bg-destructive/20 animate-shake") : "bg-[color:var(--pastel-pink)]"
          }`}
        >
          ❌ Sai
        </button>
      </div>
      {picked !== null && (
        <div className="mt-4 rounded-2xl bg-muted p-3 text-sm animate-float">
          <div className="font-semibold">{picked === q.answer ? "✅ Correct!" : `❌ Đáp án: ${q.answer ? "Đúng" : "Sai"}`}</div>
          <div className="mt-1 text-muted-foreground">{q.explanation}</div>
          <button onClick={next} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Tiếp →</button>
        </div>
      )}
    </div>
  );
}

// ---------- Matching ----------
export function MatchingGame({ items, onXp }: { items: MatchPair[]; onXp: OnXp }) {
  const pairs = useMemo(() => items.slice(0, 6), [items]);
  const [rights, setRights] = useState<string[]>([]);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);

  useEffect(() => {
    setRights([...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5));
    setMatched(new Set());
    setSelLeft(null);
  }, [pairs]);

  const tryMatch = (right: string) => {
    if (!selLeft) return;
    const pair = pairs.find((p) => p.left === selLeft);
    if (pair && pair.right === right) {
      setMatched((s) => new Set(s).add(selLeft));
      onXp(6);
      setSelLeft(null);
    } else {
      setWrong(right);
      setTimeout(() => setWrong(null), 400);
    }
  };

  const allDone = matched.size === pairs.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 text-center text-sm text-muted-foreground">Nối từ tiếng Pháp với nghĩa tiếng Việt</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {pairs.map((p) => {
            const done = matched.has(p.left);
            const sel = selLeft === p.left;
            return (
              <button
                key={p.left}
                disabled={done}
                onClick={() => setSelLeft(p.left)}
                className={`rounded-2xl px-4 py-3 text-left font-semibold shadow-[var(--shadow-soft)] transition ${
                  done ? "bg-accent/50 opacity-60 line-through" : sel ? "bg-primary text-primary-foreground" : "bg-white dark:bg-card"
                }`}
              >
                {p.left}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {rights.map((r) => {
            const done = pairs.some((p) => matched.has(p.left) && p.right === r);
            return (
              <button
                key={r}
                disabled={done}
                onClick={() => tryMatch(r)}
                className={`rounded-2xl px-4 py-3 text-left text-sm shadow-[var(--shadow-soft)] transition ${
                  done ? "bg-accent/50 opacity-60 line-through" : wrong === r ? "bg-destructive/10 animate-shake" : "bg-white dark:bg-card"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      {allDone && <div className="mt-4 rounded-2xl bg-accent/40 p-4 text-center font-bold animate-burst">🎉 Đã nối hết!</div>}
    </div>
  );
}

// ---------- Fill in blank ----------
export function FillBlankGame({ items, onXp }: { items: FillBlank[]; onXp: OnXp }) {
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [status, setStatus] = useState<"idle" | "right" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = items[i];
  if (!q) return null;

  const check = () => {
    const ok = val.trim().toLowerCase() === q.answer.trim().toLowerCase();
    setStatus(ok ? "right" : "wrong");
    if (ok) { setScore((s) => s + 1); onXp(10); }
  };
  const next = () => {
    if (i + 1 >= items.length) setDone(true);
    else { setI(i + 1); setVal(""); setStatus("idle"); }
  };
  if (done) return <Summary label="Điền vào chỗ trống" score={score} total={items.length} onReset={() => { setI(0); setVal(""); setStatus("idle"); setScore(0); setDone(false); }} />;

  const parts = q.dialogue.split("___");
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] animate-float dark:bg-card">
      <div className="mb-2 text-xs text-muted-foreground">{i + 1} / {items.length}</div>
      <div className="mb-4 text-lg leading-relaxed">
        {parts[0]}
        <span className="mx-1 inline-block min-w-[80px] rounded-lg bg-[color:var(--pastel-yellow)] px-2 font-bold">
          {status === "idle" ? "____" : val}
        </span>
        {parts[1]}
      </div>
      <div className="mb-2 text-xs text-muted-foreground">💡 Gợi ý: {q.hint}</div>
      <input
        value={val}
        disabled={status !== "idle"}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && val && check()}
        placeholder="Nhập từ tiếng Pháp..."
        className="w-full rounded-2xl border-2 border-border bg-muted px-4 py-3 outline-none focus:border-primary"
      />
      {status === "idle" ? (
        <button onClick={check} disabled={!val} className="mt-3 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
          Kiểm tra
        </button>
      ) : (
        <div className="mt-3 rounded-2xl bg-muted p-3 text-sm animate-float">
          <div className="font-semibold">{status === "right" ? "✅ Chính xác!" : `❌ Đáp án: ${q.answer}`}</div>
          <button onClick={next} className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Tiếp →</button>
        </div>
      )}
    </div>
  );
}

// ---------- Lucky Wheel ----------
const WHEEL_ACTIVITIES = [
  { key: "flashcards", label: "Thẻ ghi nhớ", color: "var(--pastel-pink)", emoji: "🃏" },
  { key: "mcq", label: "Trắc nghiệm", color: "var(--pastel-blue)", emoji: "❓" },
  { key: "truefalse", label: "Đúng/Sai", color: "var(--pastel-mint)", emoji: "⚖️" },
  { key: "match", label: "Nối từ", color: "var(--pastel-purple)", emoji: "🔗" },
  { key: "fill", label: "Điền từ", color: "var(--pastel-yellow)", emoji: "✍️" },
  { key: "vocab", label: "Từ vựng", color: "var(--pastel-peach)", emoji: "📚" },
];

export function LuckyWheel({ onLand }: { onLand: (key: string) => void }) {
  const [spinning, setSpinning] = useState(false);
  const [rot, setRot] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const seg = 360 / WHEEL_ACTIVITIES.length;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const idx = Math.floor(Math.random() * WHEEL_ACTIVITIES.length);
    const target = 360 * 5 + (360 - idx * seg - seg / 2);
    setRot(target);
    setTimeout(() => {
      setSpinning(false);
      onLand(WHEEL_ACTIVITIES[idx].key);
    }, 3200);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-64 w-64">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-3xl">🔻</div>
        <div
          ref={ref}
          className="h-full w-full rounded-full shadow-[var(--shadow-pop)] transition-transform duration-[3000ms] ease-out"
          style={{
            transform: `rotate(${rot}deg)`,
            background: `conic-gradient(${WHEEL_ACTIVITIES.map((a, i) => `${a.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(",")})`,
          }}
        >
          {WHEEL_ACTIVITIES.map((a, i) => {
            const angle = i * seg + seg / 2;
            return (
              <div
                key={a.key}
                className="absolute left-1/2 top-1/2 origin-[0_0] text-sm font-bold"
                style={{ transform: `rotate(${angle}deg) translate(60px, -10px)` }}
              >
                {a.emoji}
              </div>
            );
          })}
        </div>
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl shadow-lg">
          🎡
        </div>
      </div>
      <button
        onClick={spin}
        disabled={spinning}
        className="rounded-full bg-primary px-8 py-3 text-lg font-bold text-primary-foreground shadow-[var(--shadow-pop)] disabled:opacity-50"
      >
        {spinning ? "Đang quay…" : "QUAY 🎰"}
      </button>
    </div>
  );
}

// ---------- Vocab list ----------
export function VocabList({ items }: { items: Vocab[] }) {
  const speak = (t: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "fr-FR";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((v, i) => (
        <div key={i} className="rounded-3xl bg-white p-4 shadow-[var(--shadow-soft)] animate-float dark:bg-card" style={{ animationDelay: `${i * 40}ms` }}>
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "var(--gradient-mint)" }}>
              {v.emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-bold">{v.word}</div>
                <button onClick={() => speak(v.word)} className="text-sm">🔊</button>
              </div>
              <div className="text-xs text-muted-foreground">{v.ipa}</div>
              <div className="mt-1 text-sm">{v.definition}</div>
              <div className="mt-1 text-xs italic text-muted-foreground">"{v.example}"</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Summary({ label, score, total, onReset }: { label: string; score: number; total: number; onReset: () => void }) {
  const pct = Math.round((score / total) * 100);
  return (
    <div className="mx-auto max-w-md rounded-3xl p-6 text-center shadow-[var(--shadow-pop)] animate-burst" style={{ background: "var(--gradient-sun)" }}>
      <div className="text-5xl">{pct >= 80 ? "🏆" : pct >= 50 ? "🎉" : "💪"}</div>
      <div className="mt-2 text-xl font-bold">Hoàn thành {label}!</div>
      <div className="mt-1 text-lg">{score} / {total} · {pct}%</div>
      <button onClick={onReset} className="mt-4 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
        Làm lại
      </button>
    </div>
  );
}

export function Lesson({ lesson, onXp }: { lesson: Lesson; onXp: OnXp }) {
  const [tab, setTab] = useState<string>("vocab");

  const tabs: { key: string; label: string; emoji: string }[] = [
    { key: "vocab", label: "Từ vựng", emoji: "📚" },
    { key: "flashcards", label: "Thẻ ghi nhớ", emoji: "🃏" },
    { key: "mcq", label: "Trắc nghiệm", emoji: "❓" },
    { key: "truefalse", label: "Đúng/Sai", emoji: "⚖️" },
    { key: "match", label: "Nối từ", emoji: "🔗" },
    { key: "fill", label: "Điền từ", emoji: "✍️" },
    { key: "wheel", label: "Vòng quay", emoji: "🎡" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] transition ${
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-white dark:bg-card"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-float">
        {tab === "vocab" && <VocabList items={lesson.vocab} />}
        {tab === "flashcards" && <Flashcards items={lesson.vocab} onXp={onXp} />}
        {tab === "mcq" && <MCQGame items={lesson.mcq} onXp={onXp} />}
        {tab === "truefalse" && <TrueFalseGame items={lesson.trueFalse} onXp={onXp} />}
        {tab === "match" && <MatchingGame items={lesson.matching} onXp={onXp} />}
        {tab === "fill" && <FillBlankGame items={lesson.fillBlanks} onXp={onXp} />}
        {tab === "wheel" && <LuckyWheel onLand={(k) => setTab(k === "vocab" ? "vocab" : k)} />}
      </div>
    </div>
  );
}
