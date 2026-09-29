import { useEffect, useRef, useState } from "react";
import type { AiProvider } from "../../shared/types";
import { hasApiKey, setApiKey } from "../../lib/tauri/ai";

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
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyPresent, setKeyPresent] = useState<boolean | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setKeyPresent(null);
    setKeyError(null);

    void hasApiKey(provider)
      .then((present) => {
        if (!cancelled) {
          setKeyPresent(present);
          setShowKeyForm(!present);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setKeyPresent(false);
          setShowKeyForm(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, provider]);

  if (!open) {
    return null;
  }

  const submitPrompt = () => {
    const next = prompt.trim();
    if (!next || busy) {
      return;
    }
    onSubmit(next);
  };

  const saveApiKey = async () => {
    const key = apiKeyInput.trim();
    if (!key || keyBusy) {
      return;
    }

    setKeyBusy(true);
    setKeyError(null);
    try {
      await setApiKey(provider, key);
      setApiKeyInput("");
      setKeyPresent(true);
      setShowKeyForm(false);
      inputRef.current?.focus();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not save API key";
      setKeyError(message);
    } finally {
      setKeyBusy(false);
    }
  };

  const providerLabel = provider === "openai" ? "OpenAI" : "Claude";
  const keyStatus =
    keyPresent === null
      ? "Checking key…"
      : keyPresent
        ? `${providerLabel} key saved`
        : `${providerLabel} key missing`;

  return (
    <div
      className="absolute inset-0 z-20 flex items-start justify-center bg-black/30 pt-[18vh] backdrop-blur-md"
      onMouseDown={onClose}
    >
      <div
        className="w-[min(640px,calc(100%-32px))] overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] shadow-2xl backdrop-blur-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitPrompt();
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 text-xs text-[var(--studio-muted)]">
            <span>Prompt to BPMN</span>
            <select
              value={provider}
              onChange={(event) =>
                onProviderChange(event.currentTarget.value as AiProvider)
              }
              className="rounded-md bg-transparent px-1 py-0.5 outline-none"
              aria-label="AI provider"
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
            placeholder="Describe a process…"
            className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-[var(--studio-muted)]"
            aria-label="Process prompt"
          />
          {error ? (
            <p className="px-4 pb-2 text-sm text-red-500">{error}</p>
          ) : null}
          <div className="flex items-center justify-between gap-3 border-t border-[var(--studio-line)] px-4 py-2 text-xs text-[var(--studio-muted)]">
            <button
              type="button"
              className="rounded-md px-1 py-0.5 text-left hover:text-[var(--studio-fg)]"
              onClick={() => setShowKeyForm((current) => !current)}
            >
              {keyStatus}
            </button>
            <span>{busy ? "Generating…" : "Enter ↵"}</span>
          </div>
        </form>

        {showKeyForm ? (
          <form
            className="border-t border-[var(--studio-line)] px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void saveApiKey();
            }}
          >
            <label className="mb-1.5 block text-xs text-[var(--studio-muted)]">
              {providerLabel} API key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                disabled={keyBusy}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setApiKeyInput(event.currentTarget.value)}
                placeholder="Paste key, then save"
                className="min-w-0 flex-1 rounded-md border border-[var(--studio-line)] bg-transparent px-2.5 py-1.5 text-sm outline-none"
                aria-label={`${providerLabel} API key`}
              />
              <button
                type="submit"
                disabled={keyBusy || !apiKeyInput.trim()}
                className="rounded-md bg-[var(--studio-accent)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {keyBusy ? "Saving…" : "Save"}
              </button>
            </div>
            {keyError ? (
              <p className="mt-2 text-xs text-red-500">{keyError}</p>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
