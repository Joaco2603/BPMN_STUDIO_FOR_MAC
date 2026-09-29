import { BpmnModdle } from "bpmn-moddle";

/**
 * Catch-all for elements from other tools. bpmn-js already keeps foreign
 * attributes and bpmn:extensionElements. Children it does not recognize,
 * such as a vendor element next to the process, need a property of type
 * Element or they are dropped on save.
 */
export const foreignDescriptor = {
  name: "Foreign",
  uri: "http://bpmnstudio.app/schema/foreign",
  prefix: "foreign",
  types: [
    {
      name: "BaseElement",
      extends: ["bpmn:BaseElement"],
      properties: [
        {
          name: "extensionValues",
          type: "Element",
          isMany: true,
        },
      ],
    },
  ],
};

export const foreignModdleExtensions = {
  foreign: foreignDescriptor,
};

export async function roundTripBpmn(xml: string): Promise<string> {
  const moddle = new BpmnModdle(foreignModdleExtensions);
  const parsed = await moddle.fromXML(xml);
  const written = await moddle.toXML(parsed.rootElement, { format: true });
  return written.xml ?? "";
}
