import { invoke } from "@tauri-apps/api/core";
import type { AiProvider } from "../../shared/types";

export async function promptToBpmn(input: {
  prompt: string;
  provider: AiProvider;
}): Promise<string> {
  const result = await invoke<{ xml: string }>("prompt_to_bpmn", { request: input });
  return result.xml;
}

export async function setApiKey(provider: AiProvider, key: string): Promise<void> {
  await invoke("set_api_key", { request: { provider, key } });
}

export async function hasApiKey(provider: AiProvider): Promise<boolean> {
  return invoke<boolean>("has_api_key", { provider });
}
