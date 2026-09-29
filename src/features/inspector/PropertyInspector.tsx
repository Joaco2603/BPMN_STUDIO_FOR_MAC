import { useEffect, useState } from "react";
import type { BpmnSelection, DiagramIssue } from "../../shared/types";

export type PropertyInspectorProps = {
  selection: BpmnSelection | null;
  processName: string;
  issues: DiagramIssue[];
  onRename: (id: string, name: string) => void;
  onDocumentation: (id: string, documentation: string) => void;
  onProcessName: (name: string) => void;
  onFocusIssue: (id: string) => void;
};

export function PropertyInspector({
  selection,
  processName,
  issues,
  onRename,
  onDocumentation,
  onProcessName,
  onFocusIssue,
}: PropertyInspectorProps) {
  const [documentation, setDocumentation] = useState(selection?.documentation ?? "");
  const [processDraft, setProcessDraft] = useState(processName);

  useEffect(() => {
    setDocumentation(selection?.documentation ?? "");
  }, [selection?.documentation, selection?.id]);

  useEffect(() => {
    setProcessDraft(processName);
  }, [processName]);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--studio-line)] bg-[var(--studio-panel)]">
      <header className="border-b border-[var(--studio-line)] px-4 py-3 text-xs font-medium tracking-wide text-[var(--studio-muted)] uppercase">
        Properties
      </header>
      <label className="flex flex-col gap-2 px-4 pt-4 text-sm">
        <span className="text-xs text-[var(--studio-muted)] uppercase">Process</span>
        <input
          className="rounded-md border border-[var(--studio-line)] bg-transparent px-2 py-1.5 outline-none"
          value={processDraft}
          onChange={(event) => setProcessDraft(event.currentTarget.value)}
          onBlur={() => {
            if (processDraft !== processName) {
              onProcessName(processDraft);
            }
          }}
        />
      </label>
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
          <label className="flex flex-col gap-2">
            <span className="text-xs text-[var(--studio-muted)] uppercase">Documentation</span>
            <textarea
              className="min-h-24 resize-y rounded-md border border-[var(--studio-line)] bg-transparent px-2 py-1.5 outline-none"
              value={documentation}
              onChange={(event) => setDocumentation(event.currentTarget.value)}
              onBlur={() => {
                if (documentation !== selection.documentation) {
                  onDocumentation(selection.id, documentation);
                }
              }}
            />
          </label>
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-[var(--studio-muted)]">No selection</p>
      )}
      <div className="mt-auto border-t border-[var(--studio-line)]">
        <header className="px-4 py-3 text-xs font-medium tracking-wide text-[var(--studio-muted)] uppercase">
          Checks
        </header>
        {issues.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-[var(--studio-muted)]">No issues</p>
        ) : (
          <ul className="max-h-40 space-y-2 overflow-auto px-4 pb-4 text-sm">
            {issues.map((issue) => (
              <li key={`${issue.id ?? "diagram"}:${issue.message}`}>
                {issue.id ? (
                  <button
                    type="button"
                    className="text-left text-[var(--studio-accent)]"
                    onClick={() => onFocusIssue(issue.id as string)}
                  >
                    {issue.message}
                  </button>
                ) : (
                  issue.message
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
