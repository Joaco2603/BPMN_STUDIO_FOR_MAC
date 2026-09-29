import type { BpmnElementKind, BpmnSelection } from "../../shared/types";

const KIND_BY_TYPE: Record<string, BpmnElementKind> = {
  "bpmn:Process": "process",
  "bpmn:StartEvent": "startEvent",
  "bpmn:EndEvent": "endEvent",
  "bpmn:Task": "task",
  "bpmn:UserTask": "userTask",
  "bpmn:ServiceTask": "serviceTask",
  "bpmn:ExclusiveGateway": "exclusiveGateway",
  "bpmn:ParallelGateway": "parallelGateway",
  "bpmn:SequenceFlow": "sequenceFlow",
};

export function toElementKind(bpmnType: string): BpmnElementKind {
  return KIND_BY_TYPE[bpmnType] ?? "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function selectionFromElement(element: unknown): BpmnSelection | null {
  if (!isRecord(element)) {
    return null;
  }

  const businessObject = element.businessObject;
  if (!isRecord(businessObject)) {
    return null;
  }

  const idValue = businessObject.id ?? element.id;
  if (typeof idValue !== "string" || idValue.length === 0) {
    return null;
  }

  const typeValue =
    typeof businessObject.$type === "string"
      ? businessObject.$type
      : typeof element.type === "string"
        ? element.type
        : "";

  const name = typeof businessObject.name === "string" ? businessObject.name : "";

  return {
    id: idValue,
    kind: toElementKind(typeValue),
    name,
  };
}
