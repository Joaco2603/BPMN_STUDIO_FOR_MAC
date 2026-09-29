import { forwardRef, useImperativeHandle } from "react";
import type { BpmnCanvasHandle, BpmnSelection } from "../../shared/types";

export type BpmnCanvasProps = {
  xml: string;
  onXmlChange: (xml: string) => void;
  onSelectionChange: (selection: BpmnSelection | null) => void;
};

export const BpmnCanvas = forwardRef<BpmnCanvasHandle, BpmnCanvasProps>(
  function BpmnCanvas({ xml, onXmlChange, onSelectionChange }, ref) {
    useImperativeHandle(
      ref,
      () => ({
        getXml: async () => xml,
        loadXml: async (nextXml: string) => {
          onXmlChange(nextXml);
          onSelectionChange(null);
        },
        getSvg: async () =>
          `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text y="24">BPMN</text></svg>`,
        exportPng: async () => new Uint8Array(),
      }),
      [onSelectionChange, onXmlChange, xml],
    );

    return (
      <section className="relative min-w-0 flex-1 bg-[var(--studio-canvas)]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[var(--studio-muted)]">
          BPMN canvas
        </div>
      </section>
    );
  },
);
