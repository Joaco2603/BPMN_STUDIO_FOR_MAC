export type TitleBarProps = {
  title: string;
  dirty: boolean;
  onOpenCommandBar: () => void;
};

export function TitleBar({ title, dirty, onOpenCommandBar }: TitleBarProps) {
  return (
    <header className="flex h-12 items-center gap-3 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] pr-3 pl-24">
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
        {title}
        {dirty ? " ·" : ""}
      </h1>
      <button
        type="button"
        onClick={onOpenCommandBar}
        className="rounded-md bg-[var(--studio-bg)] px-3 py-1 text-xs text-[var(--studio-muted)]"
      >
        Prompt
      </button>
    </header>
  );
}
