export type StatusBarProps = {
  path: string | null;
  message: string | null;
};

export function StatusBar({ path, message }: StatusBarProps) {
  return (
    <footer className="flex h-7 items-center justify-between border-t border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 text-xs text-[var(--studio-muted)]">
      <span className="truncate">{path ?? "Unsaved diagram"}</span>
      <span className="truncate pl-4">{message ?? ""}</span>
    </footer>
  );
}
