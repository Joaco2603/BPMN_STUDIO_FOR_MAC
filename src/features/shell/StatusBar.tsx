export type StatusBarProps = {
  path: string | null;
  message: string | null;
};

export function StatusBar({ path, message }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span className="status-bar__path">{path ?? "Unsaved diagram"}</span>
      <span className="status-bar__message">{message ?? ""}</span>
    </footer>
  );
}
