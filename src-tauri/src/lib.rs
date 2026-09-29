mod ai;
mod bpmn;
mod commands;
mod error;
mod menu;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            menu::install(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::files::open_bpmn,
            commands::files::save_bpmn,
            commands::export::export_diagram,
            commands::ai::set_api_key,
            commands::ai::has_api_key,
            commands::ai::prompt_to_bpmn,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BPMN Studio");
}
