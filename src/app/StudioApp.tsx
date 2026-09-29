import { useCallback, useMemo, useRef, useState } from "react";
import { CommandBar } from "../features/command-bar";
import { BpmnCanvas } from "../features/canvas";
import { PropertyInspector } from "../features/inspector";
import { SheetPreview } from "../features/sheet/SheetPreview";
import { StatusBar, TitleBar, useMacShortcuts } from "../features/shell";
import intakeXml from "../../examples/intake.bpmn?raw";
import { checkDiagram } from "../features/diagram/checkDiagram";
import { renderProcessSheet } from "../features/diagram/processSheet";
import { errorMessage } from "../lib/errors";
import { promptToBpmn } from "../lib/tauri/ai";
import { exportDiagramFile, openDiagram, saveDiagram, textToBase64 } from "../lib/tauri/files";
import { EMPTY_DIAGRAM_XML, UNTITLED_DIAGRAM_NAME } from "../shared/emptyDiagram";
import type {
  AiProvider,
  BpmnCanvasHandle,
  BpmnSelection,
  DiagramIssue,
  DiagramSnapshot,
  StudioActions,
} from "../shared/types";

function diagramTitle(path: string | null): string {
  if (!path) {
    return "Untitled";
  }
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || "Untitled";
}

type PendingEdit =
  | { kind: "replace"; xml: string }
  | { kind: "fresh" };

function suggestedStem(path: string | null): string {
  const title = diagramTitle(path);
  return title.replace(/\.(bpmn|xml)$/i, "") || "Untitled";
}

export function StudioApp() {
  const canvasRef = useRef<BpmnCanvasHandle>(null);
  const [path, setPath] = useState<string | null>(null);
  const [xml, setXml] = useState(EMPTY_DIAGRAM_XML);
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState<BpmnSelection | null>(null);
  const [issues, setIssues] = useState<DiagramIssue[]>([]);
  const [processName, setProcessName] = useState("Untitled process");
  const [pending, setPending] = useState<PendingEdit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSvg, setSheetSvg] = useState("");
  const snapshotRef = useRef<DiagramSnapshot | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  const loadFresh = useCallback(async (nextXml: string) => {
    await canvasRef.current?.loadXml(nextXml);
    setPath(null);
    setDirty(false);
    setMessage(null);
    setPending(null);
  }, []);

  const open = useCallback(async () => {
    try {
      const file = await openDiagram();
      if (!file) {
        return;
      }
      await canvasRef.current?.loadXml(file.xml);
      setPath(file.path);
      setDirty(false);
      setMessage(null);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }, []);

  const save = useCallback(async () => {
    try {
      const currentXml = (await canvasRef.current?.getXml()) ?? xml;
      const saved = await saveDiagram({
        path,
        xml: currentXml,
        suggestedName: path ? diagramTitle(path) : UNTITLED_DIAGRAM_NAME,
      });
      setPath(saved.path);
      setXml(saved.xml);
      setDirty(false);
      setMessage("Saved");
    } catch (error) {
      const text = errorMessage(error);
      if (text !== "save cancelled") {
        setMessage(text);
      }
    }
  }, [path, xml]);

  const exportDiagram = useCallback(async () => {
    try {
      const svg = (await canvasRef.current?.getSvg()) ?? "";
      const exported = await exportDiagramFile({
        suggestedName: suggestedStem(path),
        extension: "svg",
        dataBase64: textToBase64(svg),
      });
      if (exported) {
        setMessage(`Exported ${exported.path}`);
      }
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }, [path]);

  const saveSheetFile = useCallback(async () => {
    try {
      const snapshot = snapshotRef.current ?? (await canvasRef.current?.getSnapshot()) ?? null;
      if (!snapshot) {
        return;
      }
      const exported = await exportDiagramFile({
        suggestedName: suggestedStem(path),
        extension: "md",
        dataBase64: textToBase64(renderProcessSheet(snapshot)),
      });
      if (exported) {
        setMessage(`Exported ${exported.path}`);
      }
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }, [path]);

  const exportSheet = useCallback(async () => {
    const snapshot = snapshotRef.current ?? (await canvasRef.current?.getSnapshot()) ?? null;
    snapshotRef.current = snapshot;
    const svg = (await canvasRef.current?.getSvg()) ?? "";
    setSheetSvg(svg);
    setSheetOpen(true);
  }, []);

  const newDiagram = useCallback(() => {
    if (dirty) {
      setPending({ kind: "fresh" });
      return;
    }
    void loadFresh(EMPTY_DIAGRAM_XML);
  }, [dirty, loadFresh]);

  const openExample = useCallback(() => {
    void loadFresh(intakeXml);
    setMessage("Example diagram");
  }, [loadFresh]);

  const toggleCommandBar = useCallback(() => {
    setCommandError(null);
    setCommandOpen((open) => !open);
  }, []);

  const actions = useMemo<StudioActions>(
    () => ({
      newDiagram: () => {
        newDiagram();
      },
      open: () => {
        void open();
      },
      save: () => {
        void save();
      },
      exportDiagram: () => {
        void exportDiagram();
      },
      exportSheet: () => {
        void exportSheet();
      },
      openExample: () => {
        openExample();
      },
      undo: () => {
        void canvasRef.current?.undo();
      },
      redo: () => {
        void canvasRef.current?.redo();
      },
      toggleCommandBar,
    }),
    [exportDiagram, exportSheet, newDiagram, open, openExample, save, toggleCommandBar],
  );
  useMacShortcuts(actions);

  const onPrompt = useCallback(async (prompt: string) => {
    setBusy(true);
    setCommandError(null);
    try {
      const generated = await promptToBpmn({ prompt, provider });
      setCommandOpen(false);
      setPending({ kind: "replace", xml: generated });
      setMessage("Review the generated diagram before replacing the canvas");
    } catch (error) {
      setCommandError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [provider]);

  const applyPending = useCallback(() => {
    if (!pending) {
      return;
    }
    if (pending.kind === "fresh") {
      void loadFresh(EMPTY_DIAGRAM_XML);
      return;
    }
    void canvasRef.current?.loadXml(pending.xml);
    setDirty(true);
    setPending(null);
    setMessage("Diagram replaced");
  }, [loadFresh, pending]);

  return (
    <div className="relative flex h-full flex-col bg-[var(--studio-bg)] text-[var(--studio-fg)]">
      <TitleBar title={diagramTitle(path)} dirty={dirty} onOpenCommandBar={toggleCommandBar} />
      {pending ? (
        <div className="confirm-bar">
          <span>
            {pending.kind === "fresh"
              ? "Discard the current diagram and start a new one?"
              : "Replace the current diagram with the generated process?"}
          </span>
          <div className="confirm-bar__actions">
            <button type="button" onClick={() => setPending(null)}>
              Keep current
            </button>
            <button type="button" onClick={applyPending}>
              {pending.kind === "fresh" ? "New diagram" : "Replace"}
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <BpmnCanvas
          ref={canvasRef}
          xml={xml}
          onXmlChange={(nextXml) => {
            setXml(nextXml);
            setDirty(true);
          }}
          onSelectionChange={setSelection}
          onSnapshot={(snapshot) => {
            snapshotRef.current = snapshot;
            setProcessName(snapshot.processName);
            setIssues(checkDiagram(snapshot));
          }}
        />
        <PropertyInspector
          selection={selection}
          processName={processName}
          issues={issues}
          onRename={(id, name) => {
            void canvasRef.current?.rename(id, name);
            setSelection((current) => (current && current.id === id ? { ...current, name } : current));
          }}
          onDocumentation={(id, documentation) => {
            void canvasRef.current?.setDocumentation(id, documentation);
          }}
          onProcessName={(name) => {
            void canvasRef.current?.setProcessName(name);
          }}
          onFocusIssue={(id) => {
            void canvasRef.current?.focus(id);
          }}
        />
      </div>
      <StatusBar
        path={path}
        message={message ?? (issues.length > 0 ? `${issues.length} diagram checks` : null)}
      />
      <CommandBar
        open={commandOpen}
        busy={busy}
        error={commandError}
        provider={provider}
        onProviderChange={setProvider}
        onClose={() => setCommandOpen(false)}
        onSubmit={(prompt) => {
          void onPrompt(prompt);
        }}
      />
      <SheetPreview
        open={sheetOpen}
        snapshot={snapshotRef.current}
        svg={sheetSvg}
        onClose={() => setSheetOpen(false)}
        onSaveMarkdown={() => {
          void saveSheetFile();
        }}
      />
    </div>
  );
}
