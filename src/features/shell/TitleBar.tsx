export type TitleBarProps = {
  title: string;
  dirty: boolean;
  onOpenCommandBar: () => void;
};

export function TitleBar({ title, dirty, onOpenCommandBar }: TitleBarProps) {
  return (
    <header className="title-bar">
      <div className="title-bar__center">
        <h1 className="title-bar__title">{title}</h1>
        {dirty ? <span className="title-bar__dirty" aria-label="Unsaved changes" /> : null}
      </div>
      <button type="button" className="title-bar__action" onClick={onOpenCommandBar}>
        Prompt
        <kbd>⌘K</kbd>
      </button>
    </header>
  );
}
