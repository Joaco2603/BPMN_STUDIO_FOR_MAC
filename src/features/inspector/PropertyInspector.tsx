import type { BpmnSelection } from "../../shared/types";

export type PropertyInspectorProps = {
  selection: BpmnSelection | null;
  onRename: (id: string, name: string) => void;
};

export function PropertyInspector({ selection, onRename }: PropertyInspectorProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--studio-line)] bg-[var(--studio-panel)]">
      <header className="border-b border-[var(--studio-line)] px-4 py-3 text-xs font-medium tracking-wide text-[var(--studio-muted)] uppercase">
        Properties
      </header>
      {selection ? (
        <label className="flex flex-col gap-2 px-4 py-4 text-sm">
          <span className="text-[var(--studio-muted)]">{selection.kind}</span>
          <input
            className="rounded-md border border-[var(--studio-line)] bg-transparent px-2 py-1.5 outline-none"
            value={selection.name}
            onChange={(event) => onRename(selection.id, event.currentTarget.value)}
          />
        </label>
      ) : (
        <p className="px-4 py-4 text-sm text-[var(--studio-muted)]">No selection</p>
      )}
    </aside>
  );
}
