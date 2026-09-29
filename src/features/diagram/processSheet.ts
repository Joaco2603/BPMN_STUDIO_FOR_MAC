import type { BpmnElementKind, DiagramSnapshot } from "../../shared/types";

const KIND_LABEL: Record<BpmnElementKind, string> = {
  process: "Process",
  startEvent: "Start event",
  endEvent: "End event",
  task: "Task",
  userTask: "User task",
  serviceTask: "Service task",
  exclusiveGateway: "Exclusive gateway",
  parallelGateway: "Parallel gateway",
  lane: "Lane",
  participant: "Pool",
  sequenceFlow: "Sequence flow",
  unknown: "Element",
};

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function renderProcessSheet(snapshot: DiagramSnapshot): string {
  const lines = [
    `# ${snapshot.processName}`,
    "",
    "## Elements",
    "",
    "| Type | Name | Documentation |",
    "| --- | --- | --- |",
  ];

  for (const node of snapshot.nodes) {
    lines.push(
      `| ${cell(KIND_LABEL[node.kind])} | ${cell(node.name)} | ${cell(node.documentation)} |`,
    );
  }

  lines.push("", "## Sequence flows", "", "| Name | From | To |", "| --- | --- | --- |");

  for (const flow of snapshot.flows) {
    const from = flow.sourceName || flow.sourceId || "";
    const to = flow.targetName || flow.targetId || "";
    lines.push(`| ${cell(flow.name)} | ${cell(from)} | ${cell(to)} |`);
  }

  lines.push("");
  return lines.join("\n");
}
