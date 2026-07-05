import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { testApiKey } from "@/lib/lesson.functions";

export function SettingsPanel({
  apiKey,
  onSave,
}: {
  apiKey: string;
  onSave: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(apiKey);
  const [visible, setVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft(apiKey);
      setResult(null);
    }
  }

  function save() {
    onSave(draft);
    setResult({ ok: true, message: "Saved in this browser (localStorage)." });
  }

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const res = await testApiKey({ data: { apiKey: draft } });
      setResult(
        res.ok
          ? { ok: true, message: "Key works! Ready to generate lessons." }
          : { ok: false, message: res.error || "Key test failed." },
      );
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof Error ? e.message : "Network error.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] dark:bg-card"
          title="API settings"
        >
          ⚙️ Settings
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>API settings</DialogTitle>
          <DialogDescription>
            Add your own Coachio API key to generate lessons. It's saved only in
            this browser and sent to the server just to call Coachio on your
            behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground">
            Coachio API key
          </label>
          <div className="flex gap-2">
            <input
              type={visible ? "text" : "password"}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setResult(null);
              }}
              placeholder="sk-..."
              className="flex-1 rounded-2xl border-2 border-white/40 bg-white/70 px-4 py-2 text-sm outline-none focus:border-primary dark:bg-card/70"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] dark:bg-card"
            >
              {visible ? "🙈 Hide" : "👁 Show"}
            </button>
          </div>

          {result && (
            <div
              className={`rounded-xl p-3 text-sm ${
                result.ok
                  ? "bg-accent/30 text-accent-foreground"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.ok ? "✅" : "⚠"} {result.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={test}
            disabled={testing}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] disabled:opacity-60 dark:bg-card"
          >
            {testing ? "Testing…" : "🧪 Test key"}
          </button>
          <button
            onClick={save}
            disabled={draft === apiKey}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)] disabled:opacity-60"
          >
            💾 Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
