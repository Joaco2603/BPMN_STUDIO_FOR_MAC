import assert from "node:assert/strict";
import { test } from "node:test";
import { roundTripBpmn } from "./foreignModdle.ts";

const FOREIGN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:vendor="http://example.com/vendor" id="Definitions_1" targetNamespace="http://example.com">
  <vendor:Catalog id="Cat_1">keep-root</vendor:Catalog>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:task id="Task_1" name="Review" vendor:score="3">
      <bpmn:extensionElements>
        <vendor:Meta owner="ops"><vendor:Note>keep me</vendor:Note></vendor:Meta>
      </bpmn:extensionElements>
    </bpmn:task>
  </bpmn:process>
</bpmn:definitions>`;

test("keeps foreign attributes, extension elements, and root vendor elements", async () => {
  const saved = await roundTripBpmn(FOREIGN_XML);
  assert.match(saved, /vendor:score="3"/);
  assert.match(saved, /vendor:Meta/);
  assert.match(saved, /keep me/);
  assert.match(saved, /vendor:Catalog/);
  assert.match(saved, /keep-root/);
});
