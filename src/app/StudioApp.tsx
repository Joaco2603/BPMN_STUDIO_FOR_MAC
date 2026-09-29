import { useCallback, useMemo, useRef, useState } from "react";
import { CommandBar } from "../features/command-bar";
import { BpmnCanvas } from "../features/canvas";
import { PropertyInspector } from "../features/inspector";
import { StatusBar, TitleBar, useMacShortcuts } from "../features/shell";
import { errorMessage } from "../lib/errors";
import { promptToBpmn } from "../lib/tauri/ai";
import { exportDiagramFile, openDiagram, saveDiagram, textToBase64 } from "../lib/tauri/files";
import { EMPTY_DIAGRAM_XML, UNTITLED_DIAGRAM_NAME } from "../shared/emptyDiagram";
import type { AiProvider, BpmnCanvasHandle, BpmnSelection, StudioActions } from "../shared/types";

function diagramTitle(path: string | null): string {
  if (!path) {
    return "Untitled";
  }
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || "Untitled";
}

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
  const [commandOpen, setCommandOpen] = useState(false);
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

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

  const toggleCommandBar = useCallback(() => {
    setCommandError(null);
    setCommandOpen((open) => !open);
  }, []);

  const actions = useMemo<StudioActions>(
    () => ({
      open: () => {
        void open();
      },
      save: () => {
        void save();
      },
      exportDiagram: () => {
        void exportDiagram();
      },
      toggleCommandBar,
    }),
    [exportDiagram, open, save, toggleCommandBar],
  );
  useMacShortcuts(actions);

  const onPrompt = useCallback(async (prompt: string) => {
    setBusy(true);
    setCommandError(null);
    try {
      const generated = await promptToBpmn({ prompt, provider });
      await canvasRef.current?.loadXml(generated);
      setDirty(true);
      setCommandOpen(false);
      setMessage("Diagram generated");
    } catch (error) {
      setCommandError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [provider]);

  return (
    <div className="relative flex h-full flex-col bg-[var(--studio-bg)] text-[var(--studio-fg)]">
      <TitleBar title={diagramTitle(path)} dirty={dirty} onOpenCommandBar={toggleCommandBar} />
      <div className="flex min-h-0 flex-1">
        <BpmnCanvas
          ref={canvasRef}
          xml={xml}
          onXmlChange={(nextXml) => {
            setXml(nextXml);
            setDirty(true);
          }}
          onSelectionChange={setSelection}
        />
        <PropertyInspector
          selection={selection}
          onRename={(id, name) => {
            setSelection((current) => (current && current.id === id ? { ...current, name } : current));
          }}
        />
      </div>
      <StatusBar path={path} message={message} />
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
    </div>
  );
}
