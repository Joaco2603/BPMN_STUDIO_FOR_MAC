import BpmnModeler from "bpmn-js/lib/Modeler";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { BpmnCanvasHandle, BpmnSelection } from "../../shared/types";
import { selectionFromElement } from "./elementKind";
import { svgToPngBytes } from "./exportPng";
import {
  asCanvasService,
  asElementRegistryService,
  asModelingService,
  asSelectionService,
  selectionNewFromEvent,
  type BpmnModelerInstance,
} from "./modelerServices";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";

export type BpmnCanvasProps = {
  xml: string;
  onXmlChange: (xml: string) => void;
  onSelectionChange: (selection: BpmnSelection | null) => void;
};

export const BpmnCanvas = forwardRef<BpmnCanvasHandle, BpmnCanvasProps>(
  function BpmnCanvas({ xml, onXmlChange, onSelectionChange }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const modelerRef = useRef<BpmnModelerInstance | null>(null);
    const xmlPropRef = useRef(xml);
    const appliedXmlRef = useRef<string | null>(null);
    const suppressXmlChangeRef = useRef(false);
    const onXmlChangeRef = useRef(onXmlChange);
    const onSelectionChangeRef = useRef(onSelectionChange);

    xmlPropRef.current = xml;
    onXmlChangeRef.current = onXmlChange;
    onSelectionChangeRef.current = onSelectionChange;

    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const modeler = new BpmnModeler({ container }) as unknown as BpmnModelerInstance;
      modelerRef.current = modeler;

      const emitSelection = (elements: unknown[]) => {
        const primary = elements[0];
        onSelectionChangeRef.current(primary ? selectionFromElement(primary) : null);
      };

      const onSelectionChanged = (event: unknown) => {
        emitSelection(selectionNewFromEvent(event));
      };

      const onCommandStackChanged = () => {
        if (suppressXmlChangeRef.current) {
          return;
        }
        void (async () => {
          const result = await modeler.saveXML({ format: true });
          if (typeof result.xml !== "string") {
            return;
          }
          appliedXmlRef.current = result.xml;
          onXmlChangeRef.current(result.xml);
        })();
      };

      modeler.on("selection.changed", onSelectionChanged);
      modeler.on("commandStack.changed", onCommandStackChanged);

      return () => {
        modeler.destroy();
        if (modelerRef.current === modeler) {
          modelerRef.current = null;
        }
        // Force a fresh import if React remounts the modeler (e.g. Strict Mode).
        appliedXmlRef.current = null;
      };
    }, []);

    useEffect(() => {
      const modeler = modelerRef.current;
      if (!modeler) {
        return;
      }
      if (xml === appliedXmlRef.current) {
        return;
      }

      let cancelled = false;

      const importDiagram = async () => {
        suppressXmlChangeRef.current = true;
        try {
          await modeler.importXML(xml);
          if (cancelled) {
            return;
          }
          const canvas = asCanvasService(modeler.get("canvas"));
          canvas?.zoom("fit-viewport");
          appliedXmlRef.current = xml;

          const selection = asSelectionService(modeler.get("selection"));
          const selected = selection?.get() ?? [];
          onSelectionChangeRef.current(
            selected[0] ? selectionFromElement(selected[0]) : null,
          );
        } finally {
          suppressXmlChangeRef.current = false;
        }
      };

      void importDiagram();

      return () => {
        cancelled = true;
      };
    }, [xml]);

    useImperativeHandle(
      ref,
      () => ({
        getXml: async () => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return xmlPropRef.current;
          }
          try {
            const result = await modeler.saveXML({ format: true });
            if (typeof result.xml === "string") {
              return result.xml;
            }
          } catch {
            // Fall back to the last known prop XML when the modeler is not ready.
          }
          return xmlPropRef.current;
        },
        loadXml: async (nextXml: string) => {
          const modeler = modelerRef.current;
          if (!modeler) {
            appliedXmlRef.current = nextXml;
            onXmlChangeRef.current(nextXml);
            onSelectionChangeRef.current(null);
            return;
          }

          suppressXmlChangeRef.current = true;
          try {
            await modeler.importXML(nextXml);
            const canvas = asCanvasService(modeler.get("canvas"));
            canvas?.zoom("fit-viewport");
            appliedXmlRef.current = nextXml;
            onXmlChangeRef.current(nextXml);
            onSelectionChangeRef.current(null);
          } finally {
            suppressXmlChangeRef.current = false;
          }
        },
        getSvg: async () => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return "";
          }
          const result = await modeler.saveSVG();
          return result.svg;
        },
        exportPng: async () => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return new Uint8Array();
          }
          const result = await modeler.saveSVG();
          return svgToPngBytes(result.svg);
        },
        rename: async (id: string, name: string) => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return;
          }
          const registry = asElementRegistryService(modeler.get("elementRegistry"));
          const modeling = asModelingService(modeler.get("modeling"));
          if (!registry || !modeling) {
            return;
          }
          const element = registry.get(id);
          if (!element) {
            return;
          }
          modeling.updateProperties(element, { name });
        },
      }),
      [],
    );

    return (
      <section className="relative min-w-0 flex-1 overflow-hidden bg-[var(--studio-canvas)]">
        <div ref={containerRef} className="absolute inset-0" />
      </section>
    );
  },
);
