use std::path::PathBuf;

use base64::Engine;
use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub suggested_name: String,
    pub extension: String,
    pub data_base64: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
}

#[tauri::command]
pub fn export_diagram(app: AppHandle, request: ExportRequest) -> Result<Option<ExportResult>, AppError> {
    let extension = match request.extension.as_str() {
        "svg" | "png" => request.extension.as_str(),
        _ => return Err(AppError::Message("export must be svg or png".into())),
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(request.data_base64.trim())
        .map_err(|error| AppError::Message(format!("invalid export payload: {error}")))?;

    let Some(picked) = app
        .dialog()
        .file()
        .add_filter(extension, &[extension])
        .set_file_name(&format!("{}.{}", request.suggested_name, extension))
        .blocking_save_file()
    else {
        return Ok(None);
    };

    let path = match picked.into_path() {
        Ok(path) => ensure_extension(path, extension),
        Err(unsupported) => {
            return Err(AppError::Message(format!(
                "unsupported file location: {unsupported}"
            )))
        }
    };
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    std::fs::write(&path, bytes)?;
    Ok(Some(ExportResult {
        path: path.display().to_string(),
    }))
}

fn ensure_extension(path: PathBuf, extension: &str) -> PathBuf {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some(current) if current.eq_ignore_ascii_case(extension) => path,
        _ => {
            let mut file_name = path
                .file_name()
                .map(|name| name.to_os_string())
                .unwrap_or_default();
            file_name.push(".");
            file_name.push(extension);
            path.with_file_name(file_name)
        }
    }
}
