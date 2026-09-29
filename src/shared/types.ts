export type AiProvider = "openai" | "claude";

export type DiagramFile = {
  path: string;
  xml: string;
};

export type ExportKind = "svg" | "png" | "md";

export type ExportResult = {
  path: string;
};

export type BpmnElementKind =
  | "process"
  | "startEvent"
  | "endEvent"
  | "task"
  | "userTask"
  | "serviceTask"
  | "exclusiveGateway"
  | "parallelGateway"
  | "lane"
  | "participant"
  | "sequenceFlow"
  | "unknown";

export type BpmnSelection = {
  id: string;
  kind: BpmnElementKind;
  name: string;
  documentation: string;
};

export type BpmnCanvasHandle = {
  getXml: () => Promise<string>;
  loadXml: (xml: string) => Promise<void>;
  getSvg: () => Promise<string>;
  exportPng: () => Promise<Uint8Array>;
  rename: (id: string, name: string) => Promise<void>;
  setDocumentation: (id: string, documentation: string) => Promise<void>;
  setProcessName: (name: string) => Promise<void>;
  focus: (id: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  getSnapshot: () => Promise<DiagramSnapshot>;
};

export type FlowNodeSnapshot = {
  id: string;
  kind: BpmnElementKind;
  name: string;
  documentation: string;
  incoming: number;
  outgoing: number;
};

export type SequenceFlowSnapshot = {
  id: string;
  name: string;
  sourceId: string | null;
  targetId: string | null;
  sourceName: string;
  targetName: string;
};

export type DiagramSnapshot = {
  processName: string;
  nodes: FlowNodeSnapshot[];
  flows: SequenceFlowSnapshot[];
};

export type DiagramIssue = {
  id: string | null;
  message: string;
};

export type StudioActions = {
  newDiagram: () => void;
  open: () => void;
  save: () => void;
  exportDiagram: () => void;
  exportSheet: () => void;
  openExample: () => void;
  undo: () => void;
  redo: () => void;
  toggleCommandBar: () => void;
};
