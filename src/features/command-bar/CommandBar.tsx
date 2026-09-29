import { useEffect, useRef, useState } from "react";
import type { AiProvider } from "../../shared/types";

export type CommandBarProps = {
  open: boolean;
  busy: boolean;
  error: string | null;
  provider: AiProvider;
  onProviderChange: (provider: AiProvider) => void;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
};

export function CommandBar({
  open,
  busy,
  error,
  provider,
  onProviderChange,
  onClose,
  onSubmit,
}: CommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center bg-black/20 pt-[18vh]" onMouseDown={onClose}>
      <form
        className="w-[min(640px,calc(100%-32px))] overflow-hidden rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const next = prompt.trim();
          if (!next || busy) {
            return;
          }
          onSubmit(next);
        }}
      >
        <div className="flex items-center justify-between px-4 pt-3 text-xs text-[var(--studio-muted)]">
          <span>Prompt to BPMN</span>
          <select
            value={provider}
            onChange={(event) => onProviderChange(event.currentTarget.value as AiProvider)}
            className="bg-transparent"
          >
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
          </select>
        </div>
        <input
          ref={inputRef}
          value={prompt}
          disabled={busy}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Describe a process…"
          className="w-full bg-transparent px-4 py-3 text-base outline-none"
        />
        {error ? <p className="px-4 pb-3 text-sm text-red-500">{error}</p> : null}
      </form>
    </div>
  );
}
