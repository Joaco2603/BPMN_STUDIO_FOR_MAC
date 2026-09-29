import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";
import type { StudioActions } from "../../shared/types";

const MENU_EVENTS: Array<[string, keyof StudioActions]> = [
  ["studio://new", "newDiagram"],
  ["studio://open", "open"],
  ["studio://save", "save"],
  ["studio://export", "exportDiagram"],
  ["studio://sheet", "exportSheet"],
  ["studio://example", "openExample"],
  ["studio://undo", "undo"],
  ["studio://redo", "redo"],
  ["studio://prompt", "toggleCommandBar"],
];

export function useMacShortcuts(actions: StudioActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "n" && !event.shiftKey) {
        event.preventDefault();
        actions.newDiagram();
        return;
      }
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        actions.redo();
        return;
      }
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        actions.undo();
        return;
      }
      if (key === "o" && !event.shiftKey) {
        event.preventDefault();
        actions.open();
        return;
      }
      if (key === "s" && !event.shiftKey) {
        event.preventDefault();
        actions.save();
        return;
      }
      if (key === "e" && event.shiftKey) {
        event.preventDefault();
        actions.exportDiagram();
        return;
      }
      if (key === "p" && event.shiftKey) {
        event.preventDefault();
        actions.exportSheet();
        return;
      }
      if (key === "k" && !event.shiftKey) {
        event.preventDefault();
        actions.toggleCommandBar();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    let cancelled = false;
    const unlisteners: UnlistenFn[] = [];

    const bindMenuEvents = async () => {
      try {
        for (const [eventName, actionKey] of MENU_EVENTS) {
          const unlisten = await listen(eventName, () => {
            actions[actionKey]();
          });
          if (cancelled) {
            unlisten();
          } else {
            unlisteners.push(unlisten);
          }
        }
      } catch {
        // Vite / browser preview is not inside Tauri.
      }
    };

    void bindMenuEvents();

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, [actions]);
}
