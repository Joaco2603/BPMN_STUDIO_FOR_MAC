export type ModelingService = {
  updateProperties: (element: unknown, properties: Record<string, unknown>) => void;
};

export type ElementRegistryService = {
  get: (id: string) => unknown;
};

export type SelectionService = {
  get: () => unknown[];
};

export type CanvasService = {
  zoom: (level: "fit-viewport" | number) => number;
};

export type SaveXmlResult = {
  xml?: string;
};

export type SaveSvgResult = {
  svg: string;
};

export type BpmnModelerInstance = {
  importXML: (xml: string) => Promise<unknown>;
  saveXML: (options?: { format?: boolean }) => Promise<SaveXmlResult>;
  saveSVG: () => Promise<SaveSvgResult>;
  get: (name: string) => unknown;
  on: (event: string, callback: (event: unknown) => void) => void;
  destroy: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasFunction(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "function";
}

export function asModelingService(value: unknown): ModelingService | null {
  if (!isRecord(value) || !hasFunction(value, "updateProperties")) {
    return null;
  }
  return value as unknown as ModelingService;
}

export function asElementRegistryService(value: unknown): ElementRegistryService | null {
  if (!isRecord(value) || !hasFunction(value, "get")) {
    return null;
  }
  return value as unknown as ElementRegistryService;
}

export function asSelectionService(value: unknown): SelectionService | null {
  if (!isRecord(value) || !hasFunction(value, "get")) {
    return null;
  }
  return value as unknown as SelectionService;
}

export function asCanvasService(value: unknown): CanvasService | null {
  if (!isRecord(value) || !hasFunction(value, "zoom")) {
    return null;
  }
  return value as unknown as CanvasService;
}

export function selectionNewFromEvent(event: unknown): unknown[] {
  if (!isRecord(event)) {
    return [];
  }
  const next = event.newSelection;
  return Array.isArray(next) ? next : [];
}
