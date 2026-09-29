import { toElementKind } from "../canvas/elementKind.ts";
import type {
  BpmnElementKind,
  DiagramSnapshot,
  FlowNodeSnapshot,
  SequenceFlowSnapshot,
} from "../../shared/types";

const FLOW_NODE_KINDS = new Set<BpmnElementKind>([
  "startEvent",
  "endEvent",
  "task",
  "userTask",
  "serviceTask",
  "exclusiveGateway",
  "parallelGateway",
  "lane",
  "participant",
  "unknown",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function documentationText(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }
  const parts: string[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const text = stringValue(entry.text) || stringValue(entry.body);
    if (text.trim()) {
      parts.push(text);
    }
  }
  return parts.join("\n");
}

function elementKind(element: Record<string, unknown>): BpmnElementKind {
  const businessObject = element.businessObject;
  if (isRecord(businessObject) && typeof businessObject.$type === "string") {
    return toElementKind(businessObject.$type);
  }
  return toElementKind(stringValue(element.type));
}

function elementId(element: Record<string, unknown>): string {
  const businessObject = element.businessObject;
  if (isRecord(businessObject) && typeof businessObject.id === "string" && businessObject.id) {
    return businessObject.id;
  }
  return stringValue(element.id);
}

function elementName(element: Record<string, unknown>): string {
  const businessObject = element.businessObject;
  if (!isRecord(businessObject)) {
    return "";
  }
  return stringValue(businessObject.name);
}

function linkCount(element: Record<string, unknown>, key: "incoming" | "outgoing"): number {
  const value = element[key];
  return Array.isArray(value) ? value.length : 0;
}

function endpointId(element: Record<string, unknown>, key: "source" | "target"): string | null {
  const endpoint = element[key];
  if (!isRecord(endpoint)) {
    return null;
  }
  const id = elementId(endpoint);
  return id || null;
}

function processNameFrom(elements: unknown[], root: unknown): string {
  const candidates = root ? [root, ...elements] : elements;
  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }
    const businessObject = isRecord(candidate.businessObject) ? candidate.businessObject : candidate;
    const type = stringValue(businessObject.$type) || stringValue(candidate.type);
    if (type !== "bpmn:Process" && type !== "bpmn:Participant") {
      continue;
    }
    const name = stringValue(businessObject.name).trim();
    if (name) {
      return name;
    }
  }
  return "Untitled process";
}

export function buildSnapshot(elements: unknown[], root: unknown = null): DiagramSnapshot {
  const nodes: FlowNodeSnapshot[] = [];
  const flowElements: Record<string, unknown>[] = [];

  for (const element of elements) {
    if (!isRecord(element) || element.type === "label") {
      continue;
    }
    const kind = elementKind(element);
    if (kind === "process") {
      continue;
    }
    if (kind === "sequenceFlow") {
      flowElements.push(element);
      continue;
    }
    if (!FLOW_NODE_KINDS.has(kind)) {
      continue;
    }
    const id = elementId(element);
    if (!id) {
      continue;
    }
    const businessObject = isRecord(element.businessObject) ? element.businessObject : {};
    nodes.push({
      id,
      kind,
      name: elementName(element),
      documentation: documentationText(businessObject.documentation),
      incoming: linkCount(element, "incoming"),
      outgoing: linkCount(element, "outgoing"),
    });
  }

  const names = new Map(nodes.map((node) => [node.id, node.name]));
  const flows: SequenceFlowSnapshot[] = flowElements.map((element) => {
    const sourceId = endpointId(element, "source");
    const targetId = endpointId(element, "target");
    return {
      id: elementId(element),
      name: elementName(element),
      sourceId,
      targetId,
      sourceName: (sourceId && names.get(sourceId)) || "",
      targetName: (targetId && names.get(targetId)) || "",
    };
  });

  return {
    processName: processNameFrom(elements, root),
    nodes,
    flows,
  };
}
