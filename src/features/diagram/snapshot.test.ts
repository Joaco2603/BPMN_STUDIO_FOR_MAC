import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSnapshot } from "./snapshot.ts";

test("reads process name, nodes, and flow endpoints without writing color", () => {
  const snapshot = buildSnapshot(
    [
      {
        id: "Start_1",
        type: "bpmn:StartEvent",
        businessObject: { $type: "bpmn:StartEvent", id: "Start_1", name: "Begin", documentation: [{ text: "Opens the case" }] },
        incoming: [],
        outgoing: [{ id: "Flow_1" }],
      },
      {
        id: "Flow_1",
        type: "bpmn:SequenceFlow",
        businessObject: { $type: "bpmn:SequenceFlow", id: "Flow_1", name: "to end" },
        source: { id: "Start_1" },
        target: { id: "End_1" },
      },
    ],
    { businessObject: { $type: "bpmn:Process", name: "Intake" } },
  );

  assert.equal(snapshot.processName, "Intake");
  assert.equal(snapshot.nodes.length, 1);
  assert.equal(snapshot.nodes[0]?.documentation, "Opens the case");
  assert.equal(snapshot.nodes[0]?.outgoing, 1);
  assert.equal(snapshot.flows[0]?.sourceName, "Begin");
  assert.equal(snapshot.flows[0]?.targetId, "End_1");
});
