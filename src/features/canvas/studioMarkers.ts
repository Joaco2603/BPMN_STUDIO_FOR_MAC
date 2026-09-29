import { toElementKind } from "./elementKind";
import type { CanvasService, ElementRegistryService } from "./modelerServices";
import type { BpmnElementKind } from "../../shared/types";

const STUDIO_MARKERS = [
  "studio-start",
  "studio-end",
  "studio-task",
  "studio-user",
  "studio-service",
  "studio-exclusive",
  "studio-parallel",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function markerForKind(kind: BpmnElementKind): (typeof STUDIO_MARKERS)[number] | null {
  switch (kind) {
    case "startEvent":
      return "studio-start";
    case "endEvent":
      return "studio-end";
    case "task":
      return "studio-task";
    case "userTask":
      return "studio-user";
    case "serviceTask":
      return "studio-service";
    case "exclusiveGateway":
      return "studio-exclusive";
    case "parallelGateway":
      return "studio-parallel";
    default:
      return null;
  }
}

const LIGHT_COLORS: Partial<Record<BpmnElementKind, { fill: string; stroke: string }>> = {
  startEvent: { fill: "#e5f6ec", stroke: "#1f8a4c" },
  endEvent: { fill: "#fde8e8", stroke: "#c23434" },
  task: { fill: "#e7f1fb", stroke: "#2f6fad" },
  userTask: { fill: "#e3f4fb", stroke: "#1d7f9c" },
  serviceTask: { fill: "#ece9fb", stroke: "#5b4db7" },
  exclusiveGateway: { fill: "#fff4d6", stroke: "#c48a12" },
  parallelGateway: { fill: "#f3e8ff", stroke: "#7a3eaf" },
};

const DARK_COLORS: Partial<Record<BpmnElementKind, { fill: string; stroke: string }>> = {
  startEvent: { fill: "#1f8f55", stroke: "#b6ffd4" },
  endEvent: { fill: "#a33b3b", stroke: "#ffd0d0" },
  task: { fill: "#2d6498", stroke: "#d6e8ff" },
  userTask: { fill: "#1d7f9c", stroke: "#d4f6ff" },
  serviceTask: { fill: "#5b4db7", stroke: "#e4ddff" },
  exclusiveGateway: { fill: "#c48a12", stroke: "#fff1c9" },
  parallelGateway: { fill: "#7a3eaf", stroke: "#f3e4ff" },
};

function colorsFor(kind: BpmnElementKind): { fill: string; stroke: string } | null {
  const palette = window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK_COLORS : LIGHT_COLORS;
  return palette[kind] ?? null;
}

function kindOf(element: unknown): BpmnElementKind {
  if (!isRecord(element)) {
    return "unknown";
  }
  const businessObject = element.businessObject;
  if (isRecord(businessObject) && typeof businessObject.$type === "string") {
    return toElementKind(businessObject.$type);
  }
  return typeof element.type === "string" ? toElementKind(element.type) : "unknown";
}

function tintGraphics(graphics: unknown, kind: BpmnElementKind): void {
  if (!(graphics instanceof Element)) {
    return;
  }
  const colors = colorsFor(kind);
  const shape = graphics.querySelector(".djs-visual > circle, .djs-visual > rect, .djs-visual > polygon");
  if (!(shape instanceof SVGElement) || !colors) {
    return;
  }
  shape.style.setProperty("fill", colors.fill, "important");
  shape.style.setProperty("stroke", colors.stroke, "important");
}

export function paintElement(
  canvas: CanvasService,
  registry: ElementRegistryService,
  element: unknown,
): void {
  try {
    for (const marker of STUDIO_MARKERS) {
      canvas.removeMarker(element, marker);
    }
    const kind = kindOf(element);
    const marker = markerForKind(kind);
    if (marker) {
      canvas.addMarker(element, marker);
    }
    tintGraphics(registry.getGraphics(element), kind);
  } catch {
    // The graphics node is not ready until bpmn-js finishes adding the shape.
  }
}

export function paintElements(canvas: CanvasService, registry: ElementRegistryService): void {
  for (const element of registry.getAll()) {
    paintElement(canvas, registry, element);
  }
}
