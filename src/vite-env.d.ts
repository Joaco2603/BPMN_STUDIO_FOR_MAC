/// <reference types="vite/client" />

declare module "*.bpmn?raw" {
  const xml: string;
  export default xml;
}

declare module "bpmn-moddle" {
  export class BpmnModdle {
    constructor(packages?: Record<string, unknown>);
    fromXML(xml: string): Promise<{ rootElement: unknown }>;
    toXML(element: unknown, options?: { format?: boolean }): Promise<{ xml?: string }>;
  }
}
