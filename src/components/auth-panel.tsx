import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const fieldClass =
  "w-full rounded-2xl border-2 border-white/40 bg-white/70 px-4 py-2 text-sm outline-none focus:border-primary dark:bg-card/70";
const pillButtonClass =
  "rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] dark:bg-card";

export function AuthPanel({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!supabaseConfigured || !supabase) {
    return (
      <span
        className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive shadow-[var(--shadow-soft)]"
        title="Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong .env.local"
      >
        ⚠ Supabase chưa cấu hình
      </span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className={pillButtonClass} title={user.email ?? ""}>
          👤 {user.email}
        </span>
        <button onClick={() => supabase!.auth.signOut()} className={pillButtonClass}>
          Đăng xuất
        </button>
      </div>
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMessage(null);
      setPassword("");
    }
  }

  async function submit() {
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase!.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({
          ok: true,
          text: "Đăng ký thành công! Nếu Supabase yêu cầu xác nhận email, hãy kiểm tra hộp thư trước khi đăng nhập.",
        });
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setOpen(false);
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Có lỗi xảy ra." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)]">
          🔑 Đăng nhập
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "signup" ? "Tạo tài khoản" : "Đăng nhập"}</DialogTitle>
          <DialogDescription>
            {mode === "signup"
              ? "Tạo tài khoản để lưu XP, streak và huy hiệu trên mọi thiết bị."
              : "Đăng nhập để đồng bộ tiến trình học của bạn."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage(null);
            }}
            placeholder="you@email.com"
            autoComplete="email"
            className={fieldClass}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setMessage(null);
            }}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={fieldClass}
          />

          {message && (
            <div
              className={`rounded-xl p-3 text-sm ${
                message.ok
                  ? "bg-accent/30 text-accent-foreground"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {message.ok ? "✅" : "⚠"} {message.text}
            </div>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setMessage(null);
            }}
            className="text-xs font-semibold text-muted-foreground underline"
          >
            {mode === "signup" ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
          </button>
          <button
            onClick={submit}
            disabled={loading || !email || password.length < 6}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)] disabled:opacity-60"
          >
            {loading ? "Đang xử lý…" : mode === "signup" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
