import assert from "node:assert/strict";
import { test } from "node:test";
import { renderProcessSheet } from "./processSheet.ts";
import type { DiagramSnapshot } from "../../shared/types.ts";

test("renders elements and flows as a markdown sheet", () => {
  const snapshot: DiagramSnapshot = {
    processName: "Hire | staff",
    nodes: [
      {
        id: "Start_1",
        kind: "startEvent",
        name: "Request",
        documentation: "Line one\nLine two",
        incoming: 0,
        outgoing: 1,
      },
    ],
    flows: [
      {
        id: "Flow_1",
        name: "next",
        sourceId: "Start_1",
        targetId: "End_1",
        sourceName: "Request",
        targetName: "Done",
      },
    ],
  };

  const sheet = renderProcessSheet(snapshot);
  assert.match(sheet, /^# Hire \\| staff/);
  assert.match(sheet, /\| Start event \| Request \| Line one Line two \|/);
  assert.match(sheet, /\| next \| Request \| Done \|/);
});
