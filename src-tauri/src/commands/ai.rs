use serde::{Deserialize, Serialize};

use crate::ai::{self, generate_bpmn, AiProvider};
use crate::bpmn::validate_bpmn_xml;
use crate::error::AppError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptRequest {
    pub prompt: String,
    pub provider: AiProvider,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedDiagram {
    pub xml: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyRequest {
    pub provider: AiProvider,
    pub key: String,
}

#[tauri::command]
pub fn set_api_key(request: ApiKeyRequest) -> Result<(), AppError> {
    ai::set_api_key(request.provider, request.key)
}

#[tauri::command]
pub fn has_api_key(provider: AiProvider) -> Result<bool, AppError> {
    ai::has_api_key(provider)
}

#[tauri::command]
pub async fn prompt_to_bpmn(request: PromptRequest) -> Result<GeneratedDiagram, AppError> {
    let prompt = request.prompt.trim();
    if prompt.is_empty() {
        return Err(AppError::Message("prompt is empty".into()));
    }
    let api_key = ai::read_api_key(request.provider)?;
    let xml = generate_bpmn(prompt, request.provider, &api_key).await?;
    validate_bpmn_xml(&xml)?;
    Ok(GeneratedDiagram { xml })
}
