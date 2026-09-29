import { useEffect } from "react";
import type { StudioActions } from "../../shared/types";

export function useMacShortcuts(actions: StudioActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey) {
        return;
      }
      const key = event.key.toLowerCase();
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
      if (key === "k" && !event.shiftKey) {
        event.preventDefault();
        actions.toggleCommandBar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);
}
