use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::bpmn::validate_bpmn_xml;
use crate::error::AppError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagramFile {
    pub path: String,
    pub xml: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    pub path: Option<String>,
    pub xml: String,
    pub suggested_name: String,
}

fn path_from_dialog(file: tauri_plugin_dialog::FilePath) -> Result<PathBuf, AppError> {
    file.into_path().map_err(|unsupported| {
        AppError::Message(format!("unsupported file location: {unsupported}"))
    })
}

#[tauri::command]
pub fn open_bpmn(app: AppHandle) -> Result<Option<DiagramFile>, AppError> {
    let Some(picked) = app
        .dialog()
        .file()
        .add_filter("BPMN 2.0", &["bpmn", "xml"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let path = path_from_dialog(picked)?;
    let xml = std::fs::read_to_string(&path)?;
    validate_bpmn_xml(&xml)?;
    Ok(Some(DiagramFile {
        path: path.display().to_string(),
        xml,
    }))
}

#[tauri::command]
pub fn save_bpmn(app: AppHandle, request: SaveRequest) -> Result<DiagramFile, AppError> {
    validate_bpmn_xml(&request.xml)?;
    let path = match request.path {
        Some(existing) => PathBuf::from(existing),
        None => {
            let Some(picked) = app
                .dialog()
                .file()
                .add_filter("BPMN 2.0", &["bpmn"])
                .set_file_name(&request.suggested_name)
                .blocking_save_file()
            else {
                return Err(AppError::Message("save cancelled".into()));
            };
            ensure_bpmn_extension(path_from_dialog(picked)?)
        }
    };

    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    std::fs::write(&path, request.xml.as_bytes())?;
    Ok(DiagramFile {
        path: path.display().to_string(),
        xml: request.xml,
    })
}

fn ensure_bpmn_extension(path: PathBuf) -> PathBuf {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some("bpmn") | Some("xml") => path,
        _ => {
            let mut file_name = path
                .file_name()
                .map(|name| name.to_os_string())
                .unwrap_or_default();
            file_name.push(".bpmn");
            path.with_file_name(file_name)
        }
    }
}
