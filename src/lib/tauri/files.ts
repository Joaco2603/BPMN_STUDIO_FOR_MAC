import { invoke } from "@tauri-apps/api/core";
import type { DiagramFile, ExportKind, ExportResult } from "../../shared/types";

export async function openDiagram(): Promise<DiagramFile | null> {
  return invoke<DiagramFile | null>("open_bpmn");
}

export async function saveDiagram(input: {
  path: string | null;
  xml: string;
  suggestedName: string;
}): Promise<DiagramFile> {
  return invoke<DiagramFile>("save_bpmn", { request: input });
}

export async function exportDiagramFile(input: {
  suggestedName: string;
  extension: ExportKind;
  dataBase64: string;
}): Promise<ExportResult | null> {
  return invoke<ExportResult | null>("export_diagram", { request: input });
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function textToBase64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}
