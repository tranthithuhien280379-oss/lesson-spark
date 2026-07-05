import { useEffect, useState, useCallback } from "react";

export type GameState = {
  xp: number;
  level: number;
  streak: number;
  lastActive: string; // YYYY-MM-DD
  badges: string[];
  dailyGoal: number; // xp target for today
  dailyProgress: number;
};

const KEY = "esl-game-state-v1";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const DEFAULT: GameState = {
  xp: 0,
  level: 1,
  streak: 0,
  lastActive: "",
  badges: [],
  dailyGoal: 50,
  dailyProgress: 0,
};

function load(): GameState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = { ...DEFAULT, ...JSON.parse(raw) } as GameState;
    // Reset daily progress if new day
    const t = today();
    if (parsed.lastActive !== t) {
      parsed.dailyProgress = 0;
    }
    return parsed;
  } catch {
    return { ...DEFAULT };
  }
}

function save(s: GameState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function xpForLevel(level: number): number {
  return level * 100;
}

export function useGame() {
  const [state, setState] = useState<GameState>(DEFAULT);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [xpToast, setXpToast] = useState<{ id: number; amount: number } | null>(null);

  useEffect(() => {
    setState(load());
  }, []);

  useEffect(() => {
    if (state.lastActive) save(state);
  }, [state]);

  const addXp = useCallback((amount: number) => {
    setState((prev) => {
      const t = today();
      let streak = prev.streak;
      if (prev.lastActive !== t) {
        streak = prev.lastActive === yesterday() ? streak + 1 : 1;
      }
      let xp = prev.xp + amount;
      let level = prev.level;
      let leveledTo: number | null = null;
      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level += 1;
        leveledTo = level;
      }
      const badges = [...prev.badges];
      const maybeAdd = (b: string) => {
        if (!badges.includes(b)) badges.push(b);
      };
      if (streak >= 3) maybeAdd("🔥 3-Day Streak");
      if (streak >= 7) maybeAdd("🏆 Week Warrior");
      if (level >= 3) maybeAdd("🎓 Rising Scholar");
      if (level >= 5) maybeAdd("⭐ Word Master");

      const dailyProgress = Math.min(prev.dailyGoal, prev.dailyProgress + amount);
      if (dailyProgress >= prev.dailyGoal) maybeAdd("🎯 Daily Goal");

      if (leveledTo) setLevelUp(leveledTo);
      setXpToast({ id: Date.now(), amount });

      return {
        ...prev,
        xp,
        level,
        streak,
        lastActive: t,
        badges,
        dailyProgress,
      };
    });
  }, []);

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  return { state, addXp, levelUp, dismissLevelUp, xpToast };
}
