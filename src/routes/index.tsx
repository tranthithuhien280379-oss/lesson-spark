import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { generateLesson, type Lesson as LessonType } from "@/lib/lesson.functions";
import { useGame, xpForLevel } from "@/lib/gamification";
import { Lesson } from "@/components/lesson/activities";
import { useAuth } from "@/lib/auth";
import { useApiKey } from "@/lib/api-key";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsPanel } from "@/components/settings-panel";
import { AuthPanel } from "@/components/auth-panel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LinguaQuest — Gamified ESL Lessons from Any Text" },
      {
        name: "description",
        content:
          "Paste any topic or text and get an interactive English lesson: flashcards, quizzes, matching, wheel of fortune, and XP rewards. Powered by Coachio AI.",
      },
      { property: "og:title", content: "LinguaQuest — Gamified ESL Lessons" },
      { property: "og:description", content: "Turn any text into a fun, interactive English lesson with XP, streaks, and badges." },
    ],
  }),
  component: Index,
});

const SAMPLE = `The Solar System has eight planets that orbit the Sun. Mercury is the closest and smallest. Venus is very hot. Earth is our home and has water and life. Mars is called the Red Planet. Jupiter is the biggest planet. Saturn has beautiful rings. Uranus and Neptune are cold gas giants far from the Sun.`;

function Index() {
  const [source, setSource] = useState("");
  const [lesson, setLesson] = useState<LessonType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { apiKey, setApiKey } = useApiKey();
  const { state, addXp, levelUp, dismissLevelUp, xpToast } = useGame(user?.id ?? null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setLesson(null);
    try {
      const l = await generateLesson({ data: { source: source || SAMPLE, apiKey } });
      setLesson(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const levelPct = Math.min(100, Math.round((state.xp / xpForLevel(state.level)) * 100));
  const dailyPct = Math.min(100, Math.round((state.dailyProgress / state.dailyGoal) * 100));

  return (
    <div className="min-h-screen">
      {/* HUD */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-lg font-extrabold">
            <span className="text-2xl">🦉</span>
            LinguaQuest
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <Chip color="var(--gradient-sun)">🔥 {state.streak} day streak</Chip>
            <Chip color="var(--gradient-mint)">⭐ Lv {state.level}</Chip>
            <Chip color="var(--gradient-card)">💎 {state.xp} XP</Chip>
            <ThemeToggle />
            <SettingsPanel apiKey={apiKey} onSave={setApiKey} />
            <AuthPanel user={user} />
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="w-24">Level {state.level}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-all" style={{ width: `${levelPct}%`, background: "var(--gradient-hero)" }} />
            </div>
            <span>{state.xp}/{xpForLevel(state.level)}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="w-24">🎯 Daily goal</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[color:var(--accent)] transition-all" style={{ width: `${dailyPct}%` }} />
            </div>
            <span>{state.dailyProgress}/{state.dailyGoal} XP</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Input card */}
        <section className="rounded-3xl p-6 shadow-[var(--shadow-pop)]" style={{ background: "var(--gradient-hero)" }}>
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">Turn any text into a fun English lesson</h1>
          <p className="mt-1 text-sm text-foreground/80">
            Paste a paragraph, an article, a topic, or a story. AI will build vocab, flashcards, quizzes, matching, and more.
          </p>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste text or type a topic (e.g. 'Ordering coffee at a café')..."
            className="mt-4 h-32 w-full rounded-2xl border-2 border-white/40 bg-white/70 p-4 text-sm outline-none focus:border-primary dark:bg-card/70"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={generate}
              disabled={loading}
              className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-[var(--shadow-pop)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? "✨ Generating lesson…" : "🚀 Generate Lesson"}
            </button>
            <button
              onClick={() => setSource(SAMPLE)}
              className="rounded-full bg-white px-5 py-3 font-semibold shadow-[var(--shadow-soft)] dark:bg-card"
            >
              Try sample
            </button>
            {lesson && (
              <button
                onClick={() => { setLesson(null); setSource(""); }}
                className="rounded-full bg-white/80 px-5 py-3 font-semibold shadow-[var(--shadow-soft)] dark:bg-card/80"
              >
                New lesson
              </button>
            )}
          </div>
          {error && <div className="mt-3 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        </section>

        {/* Badges */}
        {state.badges.length > 0 && (
          <section className="mt-4 flex flex-wrap gap-2">
            {state.badges.map((b) => (
              <span key={b} className="rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-[var(--shadow-soft)] animate-pop dark:bg-card">
                {b}
              </span>
            ))}
          </section>
        )}

        {/* Lesson */}
        {loading && <SkeletonLesson />}

        {lesson && (
          <section className="mt-6">
            <div className="mb-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)] dark:bg-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{lesson.level} · Lesson</div>
              <h2 className="mt-1 text-2xl font-extrabold">{lesson.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{lesson.summary}</p>
            </div>
            <Lesson lesson={lesson} onXp={addXp} />
          </section>
        )}

        {!lesson && !loading && (
          <section className="mt-8 grid gap-3 sm:grid-cols-3">
            <FeatureCard emoji="🃏" title="Flashcards" desc="Flip cards to learn words with pronunciation and examples." bg="var(--gradient-card)" />
            <FeatureCard emoji="🎡" title="Wheel of Fortune" desc="Spin for a random activity to keep learning fun." bg="var(--gradient-mint)" />
            <FeatureCard emoji="🏆" title="XP & Badges" desc="Earn XP, keep streaks, and unlock achievements." bg="var(--gradient-sun)" />
          </section>
        )}
      </main>

      {/* XP toast */}
      {xpToast && (
        <div key={xpToast.id} className="pointer-events-none fixed bottom-6 right-6 z-30 rounded-full bg-[color:var(--xp-gold)] px-4 py-2 font-bold text-white shadow-[var(--shadow-pop)] animate-burst">
          +{xpToast.amount} XP
        </div>
      )}

      {/* Level up modal */}
      {levelUp !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={dismissLevelUp}>
          <div className="max-w-sm rounded-3xl p-8 text-center shadow-[var(--shadow-pop)] animate-burst" style={{ background: "var(--gradient-hero)" }}>
            <div className="text-6xl">🎉</div>
            <div className="mt-2 text-3xl font-extrabold">Level Up!</div>
            <div className="mt-1 text-lg">You reached level {levelUp}</div>
            <button onClick={dismissLevelUp} className="mt-4 rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground">
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="rounded-full px-3 py-1 text-xs font-bold shadow-[var(--shadow-soft)]" style={{ background: color }}>
      {children}
    </span>
  );
}

function FeatureCard({ emoji, title, desc, bg }: { emoji: string; title: string; desc: string; bg: string }) {
  return (
    <div className="rounded-3xl p-5 shadow-[var(--shadow-soft)] animate-float" style={{ background: bg }}>
      <div className="text-3xl">{emoji}</div>
      <div className="mt-2 font-bold">{title}</div>
      <div className="text-sm text-foreground/70">{desc}</div>
    </div>
  );
}

function SkeletonLesson() {
  return (
    <div className="mt-6 animate-pulse space-y-3">
      <div className="h-24 rounded-3xl bg-white/60 dark:bg-card/60" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-white/60 dark:bg-card/60" />
        ))}
      </div>
    </div>
  );
}
