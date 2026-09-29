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
        <div className="flex flex-col gap-4 px-4 py-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--studio-muted)] uppercase">Type</span>
            <span>{selection.kind}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--studio-muted)] uppercase">Id</span>
            <span className="break-all font-mono text-xs">{selection.id}</span>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-[var(--studio-muted)] uppercase">Name</span>
            <input
              className="rounded-md border border-[var(--studio-line)] bg-transparent px-2 py-1.5 outline-none"
              value={selection.name}
              onChange={(event) => onRename(selection.id, event.currentTarget.value)}
            />
          </label>
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-[var(--studio-muted)]">No selection</p>
      )}
    </aside>
  );
}
