//! Native macOS application menu. File items emit `studio://*` events for the shell.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Emitter;

/// Install the app menu bar and forward File actions to the frontend.
pub fn install(app: &tauri::App) -> tauri::Result<()> {
    let new_diagram = MenuItem::with_id(app, "new", "New", true, Some("CmdOrCtrl+N"))?;
    let open = MenuItem::with_id(app, "open", "Open…", true, Some("CmdOrCtrl+O"))?;
    let save = MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?;
    let export = MenuItem::with_id(app, "export", "Export SVG…", true, Some("CmdOrCtrl+Shift+E"))?;
    let sheet = MenuItem::with_id(
        app,
        "sheet",
        "Process Sheet…",
        true,
        Some("CmdOrCtrl+Shift+P"),
    )?;
    let prompt = MenuItem::with_id(app, "prompt", "Prompt to BPMN…", true, Some("CmdOrCtrl+K"))?;
    let undo = MenuItem::with_id(app, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
    let redo = MenuItem::with_id(app, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?;
    let example = MenuItem::with_id(app, "example", "Open Example", true, None::<&str>)?;

    let app_name = app.package_info().name.clone();
    let app_menu = Submenu::with_items(
        app,
        app_name,
        true,
        &[
            &PredefinedMenuItem::about(app, None, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &new_diagram,
            &open,
            &save,
            &PredefinedMenuItem::separator(app)?,
            &export,
            &sheet,
            &prompt,
        ],
    )?;

    let edit_menu = Submenu::with_items(app, "Edit", true, &[&undo, &redo])?;
    let help_menu = Submenu::with_items(app, "Help", true, &[&example])?;

    let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu, &help_menu])?;
    app.set_menu(menu)?;

    app.on_menu_event(|app, event| {
        let event_name = match event.id().as_ref() {
            "new" => Some("studio://new"),
            "open" => Some("studio://open"),
            "save" => Some("studio://save"),
            "export" => Some("studio://export"),
            "sheet" => Some("studio://sheet"),
            "example" => Some("studio://example"),
            "undo" => Some("studio://undo"),
            "redo" => Some("studio://redo"),
            "prompt" => Some("studio://prompt"),
            _ => None,
        };

        if let Some(name) = event_name {
            let _ = app.emit(name, ());
        }
    });

    Ok(())
}
