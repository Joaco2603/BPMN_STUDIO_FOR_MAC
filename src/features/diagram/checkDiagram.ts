import type { BpmnElementKind, DiagramIssue, DiagramSnapshot, FlowNodeSnapshot } from "../../shared/types";

const CONNECTED_KINDS = new Set<BpmnElementKind>([
  "task",
  "userTask",
  "serviceTask",
  "exclusiveGateway",
  "parallelGateway",
]);

const NAMED_KINDS = new Set<BpmnElementKind>([
  "task",
  "userTask",
  "serviceTask",
  "exclusiveGateway",
  "parallelGateway",
  "lane",
  "participant",
]);

function displayName(node: FlowNodeSnapshot): string {
  return node.name.trim() || node.id;
}

export function checkDiagram(snapshot: DiagramSnapshot): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  const starts = snapshot.nodes.filter((node) => node.kind === "startEvent");
  const ends = snapshot.nodes.filter((node) => node.kind === "endEvent");

  if (starts.length === 0) {
    issues.push({ id: null, message: "Add a start event." });
  }
  if (ends.length === 0) {
    issues.push({ id: null, message: "Add an end event." });
  }

  for (const node of snapshot.nodes) {
    if (node.kind === "startEvent" && node.outgoing === 0) {
      issues.push({ id: node.id, message: `${displayName(node)} has no outgoing flow.` });
    }
    if (node.kind === "endEvent" && node.incoming === 0) {
      issues.push({ id: node.id, message: `${displayName(node)} has no incoming flow.` });
    }
    if (CONNECTED_KINDS.has(node.kind) && (node.incoming === 0 || node.outgoing === 0)) {
      issues.push({ id: node.id, message: `${displayName(node)} is not fully connected.` });
    }
    if (NAMED_KINDS.has(node.kind) && node.name.trim().length === 0) {
      issues.push({ id: node.id, message: `${node.id} has no name.` });
    }
    if (node.kind === "exclusiveGateway" && node.outgoing === 1) {
      issues.push({ id: node.id, message: `${displayName(node)} has only one outgoing flow.` });
    }
  }

  for (const flow of snapshot.flows) {
    if (!flow.sourceId || !flow.targetId) {
      issues.push({
        id: flow.id || null,
        message: "A sequence flow is missing a source or target.",
      });
    }
  }

  return issues;
}
