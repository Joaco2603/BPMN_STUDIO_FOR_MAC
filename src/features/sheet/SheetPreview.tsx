import type { DiagramSnapshot } from "../../shared/types";
import { renderProcessSheet } from "../diagram/processSheet";

export type SheetPreviewProps = {
  open: boolean;
  snapshot: DiagramSnapshot | null;
  svg: string;
  onClose: () => void;
  onSaveMarkdown: () => void;
};

export function SheetPreview({ open, snapshot, svg, onClose, onSaveMarkdown }: SheetPreviewProps) {
  if (!open || !snapshot) {
    return null;
  }

  const markdown = renderProcessSheet(snapshot);

  return (
    <div className="sheet-preview absolute inset-0 z-30 overflow-auto bg-[var(--studio-bg)] text-[var(--studio-fg)]">
      <div className="no-print flex items-center justify-end gap-2 border-b border-[var(--studio-line)] px-4 py-3">
        <button type="button" className="rounded-md px-3 py-1 text-sm" onClick={onSaveMarkdown}>
          Save Markdown
        </button>
        <button type="button" className="rounded-md px-3 py-1 text-sm" onClick={() => window.print()}>
          Print
        </button>
        <button type="button" className="rounded-md px-3 py-1 text-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <article className="mx-auto max-w-3xl px-8 py-8">
        <h2 className="text-2xl font-semibold">{snapshot.processName}</h2>
        {svg ? (
          <div
            className="sheet-diagram my-6 overflow-hidden rounded-lg border border-[var(--studio-line)] bg-white p-4"
            dangerouslySetInnerHTML={{ __html: svg.replace(/<\?xml[\s\S]*?\?>/, "").trim() }}
          />
        ) : null}
        <pre className="font-sans text-sm leading-6 whitespace-pre-wrap">{markdown}</pre>
      </article>
    </div>
  );
}
