import BpmnModeler from "bpmn-js/lib/Modeler";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { BpmnCanvasHandle, BpmnSelection, DiagramSnapshot } from "../../shared/types";
import { buildSnapshot } from "../diagram/snapshot";
import { selectionFromElement } from "./elementKind";
import { svgToPngBytes } from "./exportPng";
import {
  asCanvasService,
  asElementRegistryService,
  asModdleService,
  asModelingService,
  asSelectionService,
  selectionNewFromEvent,
  type BpmnModelerInstance,
} from "./modelerServices";
import { foreignModdleExtensions } from "./foreignModdle";
import { paintElement, paintElements } from "./studioMarkers";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "../../styles/canvas.css";

const EMPTY_SNAPSHOT: DiagramSnapshot = {
  processName: "Untitled process",
  nodes: [],
  flows: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function elementFromEvent(event: unknown): unknown {
  if (!isRecord(event)) {
    return null;
  }
  return event.element ?? null;
}

function callMethod(target: unknown, method: string, ...args: unknown[]): void {
  if (!isRecord(target) || typeof target[method] !== "function") {
    return;
  }
  (target[method] as (...values: unknown[]) => void)(...args);
}

export type BpmnCanvasProps = {
  xml: string;
  onXmlChange: (xml: string) => void;
  onSelectionChange: (selection: BpmnSelection | null) => void;
  onSnapshot: (snapshot: DiagramSnapshot) => void;
};

export const BpmnCanvas = forwardRef<BpmnCanvasHandle, BpmnCanvasProps>(
  function BpmnCanvas({ xml, onXmlChange, onSelectionChange, onSnapshot }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const modelerRef = useRef<BpmnModelerInstance | null>(null);
    const xmlPropRef = useRef(xml);
    const appliedXmlRef = useRef<string | null>(null);
    const suppressXmlChangeRef = useRef(false);
    const onXmlChangeRef = useRef(onXmlChange);
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onSnapshotRef = useRef(onSnapshot);

    xmlPropRef.current = xml;
    onXmlChangeRef.current = onXmlChange;
    onSelectionChangeRef.current = onSelectionChange;
    onSnapshotRef.current = onSnapshot;

    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const modeler = new BpmnModeler({
        container,
        moddleExtensions: foreignModdleExtensions,
      }) as unknown as BpmnModelerInstance;
      modelerRef.current = modeler;

      const refreshAppearance = () => {
        const canvas = asCanvasService(modeler.get("canvas"));
        const registry = asElementRegistryService(modeler.get("elementRegistry"));
        if (!canvas || !registry) {
          onSnapshotRef.current(EMPTY_SNAPSHOT);
          return;
        }
        const elements = registry.getAll();
        paintElements(canvas, registry);
        onSnapshotRef.current(buildSnapshot(elements, canvas.getRootElement()));
      };

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
          refreshAppearance();
        })();
      };

      const onElementAdded = (event: unknown) => {
        const canvas = asCanvasService(modeler.get("canvas"));
        const registry = asElementRegistryService(modeler.get("elementRegistry"));
        const element = elementFromEvent(event);
        if (canvas && registry && element) {
          paintElement(canvas, registry, element);
        }
      };

      modeler.on("selection.changed", onSelectionChanged);
      modeler.on("commandStack.changed", onCommandStackChanged);
      modeler.on("shape.added", onElementAdded);
      modeler.on("connection.added", onElementAdded);

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

          const registry = asElementRegistryService(modeler.get("elementRegistry"));
          const elements = registry?.getAll() ?? [];
          if (canvas && registry) {
            paintElements(canvas, registry);
            onSnapshotRef.current(buildSnapshot(elements, canvas.getRootElement()));
          } else {
            onSnapshotRef.current(buildSnapshot(elements, null));
          }

          const selection = asSelectionService(modeler.get("selection"));
          const selected = selection?.get() ?? [];
          onSelectionChangeRef.current(
            selected[0] ? selectionFromElement(selected[0]) : null,
          );
        } catch {
          if (!cancelled) {
            onSnapshotRef.current(EMPTY_SNAPSHOT);
          }
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
            const registry = asElementRegistryService(modeler.get("elementRegistry"));
            const elements = registry?.getAll() ?? [];
            if (canvas && registry) {
              paintElements(canvas, registry);
              onSnapshotRef.current(buildSnapshot(elements, canvas.getRootElement()));
            } else {
              onSnapshotRef.current(buildSnapshot(elements, null));
            }
            onSelectionChangeRef.current(null);
          } catch {
            onSnapshotRef.current(EMPTY_SNAPSHOT);
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
        setDocumentation: async (id: string, documentation: string) => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return;
          }
          const registry = asElementRegistryService(modeler.get("elementRegistry"));
          const modeling = asModelingService(modeler.get("modeling"));
          const moddle = asModdleService(modeler.get("moddle"));
          if (!registry || !modeling || !moddle) {
            return;
          }
          const element = registry.get(id);
          if (!element) {
            return;
          }
          const text = documentation.trim();
          const docs = text ? [moddle.create("bpmn:Documentation", { text })] : [];
          modeling.updateProperties(element, { documentation: docs });
          onSelectionChangeRef.current(selectionFromElement(registry.get(id)));
        },
        setProcessName: async (name: string) => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return;
          }
          const canvas = asCanvasService(modeler.get("canvas"));
          const modeling = asModelingService(modeler.get("modeling"));
          const root = canvas?.getRootElement();
          if (!root || !modeling) {
            return;
          }
          modeling.updateProperties(root, { name: name.trim() });
        },
        focus: async (id: string) => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return;
          }
          const registry = asElementRegistryService(modeler.get("elementRegistry"));
          const element = registry?.get(id);
          if (!element) {
            return;
          }
          callMethod(modeler.get("selection"), "select", element);
          callMethod(modeler.get("canvas"), "scrollToElement", element);
        },
        undo: async () => {
          callMethod(modelerRef.current?.get("commandStack"), "undo");
        },
        redo: async () => {
          callMethod(modelerRef.current?.get("commandStack"), "redo");
        },
        getSnapshot: async () => {
          const modeler = modelerRef.current;
          if (!modeler) {
            return EMPTY_SNAPSHOT;
          }
          const registry = asElementRegistryService(modeler.get("elementRegistry"));
          const canvas = asCanvasService(modeler.get("canvas"));
          if (!registry || !canvas) {
            return EMPTY_SNAPSHOT;
          }
          return buildSnapshot(registry.getAll(), canvas.getRootElement());
        },
      }),
      [],
    );

    return (
      <section className="studio-canvas relative min-w-0 flex-1 overflow-hidden bg-[var(--studio-canvas)]">
        <div ref={containerRef} className="absolute inset-0" />
      </section>
    );
  },
);
