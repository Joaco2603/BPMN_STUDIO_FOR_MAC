use super::AiProvider;
use crate::error::AppError;

/// Prompt-to-BPMN boundary.
///
/// Implementations must return raw BPMN 2.0 XML (UTF-8), with no markdown fences.
/// The API key is read from the macOS keychain by the caller and must not be logged.
pub async fn generate_bpmn(
    prompt: &str,
    provider: AiProvider,
    api_key: &str,
) -> Result<String, AppError> {
    let _ = (prompt, provider, api_key);
    Err(AppError::Message(
        "Prompt-to-BPMN provider call is not implemented yet".into(),
    ))
}
