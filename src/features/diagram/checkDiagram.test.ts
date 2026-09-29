import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDiagram } from "./checkDiagram.ts";
import type { DiagramSnapshot } from "../../shared/types.ts";

function snapshot(partial: Partial<DiagramSnapshot>): DiagramSnapshot {
  return {
    processName: "Intake",
    nodes: [],
    flows: [],
    ...partial,
  };
}

test("flags a diagram with no start or end", () => {
  const issues = checkDiagram(
    snapshot({
      nodes: [
        {
          id: "Task_1",
          kind: "task",
          name: "Review",
          documentation: "",
          incoming: 0,
          outgoing: 0,
        },
      ],
    }),
  );
  assert.ok(issues.some((issue) => issue.message === "Add a start event."));
  assert.ok(issues.some((issue) => issue.message === "Add an end event."));
  assert.ok(issues.some((issue) => issue.id === "Task_1"));
});

test("accepts a connected start, task, and end", () => {
  const issues = checkDiagram(
    snapshot({
      nodes: [
        { id: "Start_1", kind: "startEvent", name: "Start", documentation: "", incoming: 0, outgoing: 1 },
        { id: "Task_1", kind: "userTask", name: "Approve", documentation: "", incoming: 1, outgoing: 1 },
        { id: "End_1", kind: "endEvent", name: "End", documentation: "", incoming: 1, outgoing: 0 },
      ],
      flows: [
        { id: "Flow_1", name: "", sourceId: "Start_1", targetId: "Task_1", sourceName: "Start", targetName: "Approve" },
        { id: "Flow_2", name: "", sourceId: "Task_1", targetId: "End_1", sourceName: "Approve", targetName: "End" },
      ],
    }),
  );
  assert.deepEqual(issues, []);
});

test("flags an unnamed task and a one-way exclusive gateway", () => {
  const issues = checkDiagram(
    snapshot({
      nodes: [
        { id: "Start_1", kind: "startEvent", name: "Start", documentation: "", incoming: 0, outgoing: 1 },
        { id: "Task_1", kind: "task", name: "  ", documentation: "", incoming: 1, outgoing: 1 },
        { id: "Gateway_1", kind: "exclusiveGateway", name: "Decide", documentation: "", incoming: 1, outgoing: 1 },
        { id: "End_1", kind: "endEvent", name: "End", documentation: "", incoming: 1, outgoing: 0 },
      ],
    }),
  );
  assert.ok(issues.some((issue) => issue.id === "Task_1" && issue.message === "Task_1 has no name."));
  assert.ok(issues.some((issue) => issue.id === "Gateway_1" && issue.message.includes("only one outgoing")));
});

test("flags a sequence flow with a missing endpoint", () => {
  const issues = checkDiagram(
    snapshot({
      nodes: [
        { id: "Start_1", kind: "startEvent", name: "", documentation: "", incoming: 0, outgoing: 1 },
        { id: "End_1", kind: "endEvent", name: "", documentation: "", incoming: 1, outgoing: 0 },
      ],
      flows: [
        { id: "Flow_1", name: "", sourceId: "Start_1", targetId: null, sourceName: "", targetName: "" },
      ],
    }),
  );
  assert.ok(issues.some((issue) => issue.id === "Flow_1"));
});
