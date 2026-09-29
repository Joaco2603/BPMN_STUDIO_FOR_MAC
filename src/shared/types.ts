export type AiProvider = "openai" | "claude";

export type DiagramFile = {
  path: string;
  xml: string;
};

export type ExportKind = "svg" | "png";

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
  | "sequenceFlow"
  | "unknown";

export type BpmnSelection = {
  id: string;
  kind: BpmnElementKind;
  name: string;
};

export type BpmnCanvasHandle = {
  getXml: () => Promise<string>;
  loadXml: (xml: string) => Promise<void>;
  getSvg: () => Promise<string>;
  exportPng: () => Promise<Uint8Array>;
};

export type StudioActions = {
  open: () => void;
  save: () => void;
  exportDiagram: () => void;
  toggleCommandBar: () => void;
};
