use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::AiProvider;
use crate::error::AppError;

const OPENAI_URL: &str = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL: &str = "gpt-4.1-mini";
const CLAUDE_URL: &str = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL: &str = "claude-sonnet-4-5";
const ANTHROPIC_VERSION: &str = "2023-06-01";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
const TEMPERATURE: f32 = 0.1;

const SYSTEM_PROMPT: &str = "\
You are a BPMN 2.0 compiler. Output ONLY XML, no prose, no fences. \
The document must be industry-compatible (Bizagi/Camunda): namespaces bpmn, bpmndi, dc, di; \
a process with isExecutable=false; a BPMNDiagram/BPMNPlane; a BPMNShape with dc:Bounds for every flow node; \
a BPMNEdge with di:waypoint for every sequence flow. \
Use these element types only: startEvent, endEvent, task, userTask, serviceTask, exclusiveGateway, parallelGateway, sequenceFlow. \
Ids must be unique. Names come from the user prompt.";

/// Prompt-to-BPMN boundary.
///
/// Implementations must return raw BPMN 2.0 XML (UTF-8), with no markdown fences.
/// The API key is read from the macOS keychain by the caller and must not be logged.
pub async fn generate_bpmn(
    prompt: &str,
    provider: AiProvider,
    api_key: &str,
) -> Result<String, AppError> {
    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()?;

    let raw = match provider {
        AiProvider::Openai => call_openai(&client, prompt, api_key).await?,
        AiProvider::Claude => call_claude(&client, prompt, api_key).await?,
    };

    let xml = strip_markdown_fences(&raw);
    if !looks_like_bpmn(&xml) {
        return Err(AppError::InvalidBpmn(
            "model response was not BPMN XML".into(),
        ));
    }
    Ok(xml)
}

/// Strip optional markdown fences (``` / ```xml) and surrounding whitespace.
pub(crate) fn strip_markdown_fences(raw: &str) -> String {
    let trimmed = raw.trim();
    if !trimmed.starts_with("```") {
        return trimmed.to_string();
    }

    let after_open = &trimmed[3..];
    let body = match after_open.find('\n') {
        Some(idx) => &after_open[idx + 1..],
        None => after_open,
    };

    let without_close = body
        .trim_end()
        .strip_suffix("```")
        .map(str::trim_end)
        .unwrap_or_else(|| body.trim_end());

    without_close.trim().to_string()
}

fn looks_like_bpmn(xml: &str) -> bool {
    let trimmed = xml.trim();
    !trimmed.is_empty() && trimmed.contains("definitions")
}

async fn call_openai(
    client: &reqwest::Client,
    prompt: &str,
    api_key: &str,
) -> Result<String, AppError> {
    let request = OpenAiChatRequest {
        model: OPENAI_MODEL,
        temperature: TEMPERATURE,
        messages: vec![
            OpenAiMessage {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            OpenAiMessage {
                role: "user",
                content: prompt,
            },
        ],
    };

    let response = client
        .post(OPENAI_URL)
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await?;

    let status = response.status();
    let body = response.text().await?;
    if !status.is_success() {
        return Err(AppError::Message(format!(
            "OpenAI request failed ({status}): {}",
            truncate_error_body(&body)
        )));
    }

    let parsed: OpenAiChatResponse = serde_json::from_str(&body)
        .map_err(|error| AppError::Message(format!("invalid OpenAI response: {error}")))?;

    parsed
        .choices
        .into_iter()
        .next()
        .and_then(|choice| choice.message.content)
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| AppError::Message("OpenAI response missing content".into()))
}

async fn call_claude(
    client: &reqwest::Client,
    prompt: &str,
    api_key: &str,
) -> Result<String, AppError> {
    let request = ClaudeMessagesRequest {
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        temperature: TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: vec![ClaudeMessage {
            role: "user",
            content: prompt,
        }],
    };

    let response = client
        .post(CLAUDE_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await?;

    let status = response.status();
    let body = response.text().await?;
    if !status.is_success() {
        return Err(AppError::Message(format!(
            "Claude request failed ({status}): {}",
            truncate_error_body(&body)
        )));
    }

    let parsed: ClaudeMessagesResponse = serde_json::from_str(&body)
        .map_err(|error| AppError::Message(format!("invalid Claude response: {error}")))?;

    let text = parsed
        .content
        .into_iter()
        .filter(|block| block.block_type == "text")
        .filter_map(|block| block.text)
        .collect::<Vec<_>>()
        .join("\n");

    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err(AppError::Message(
            "Claude response missing text content".into(),
        ));
    }
    Ok(trimmed.to_string())
}

fn truncate_error_body(body: &str) -> String {
    const MAX: usize = 240;
    let compact = body.trim();
    if compact.chars().count() <= MAX {
        return compact.to_string();
    }
    let truncated: String = compact.chars().take(MAX).collect();
    format!("{truncated}…")
}

#[derive(Debug, Serialize)]
struct OpenAiChatRequest<'a> {
    model: &'a str,
    temperature: f32,
    messages: Vec<OpenAiMessage<'a>>,
}

#[derive(Debug, Serialize)]
struct OpenAiMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct OpenAiChatResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: OpenAiResponseMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponseMessage {
    content: Option<String>,
}

#[derive(Debug, Serialize)]
struct ClaudeMessagesRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    temperature: f32,
    system: &'a str,
    messages: Vec<ClaudeMessage<'a>>,
}

#[derive(Debug, Serialize)]
struct ClaudeMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct ClaudeMessagesResponse {
    content: Vec<ClaudeContentBlock>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    text: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::strip_markdown_fences;

    #[test]
    fn strips_xml_fences_and_whitespace() {
        let raw = "  ```xml\n<bpmn:definitions/>\n```  ";
        assert_eq!(strip_markdown_fences(raw), "<bpmn:definitions/>");
    }

    #[test]
    fn strips_bare_fences() {
        let raw = "```\n<root/>\n```";
        assert_eq!(strip_markdown_fences(raw), "<root/>");
    }

    #[test]
    fn leaves_plain_xml_unchanged() {
        let raw = "  <bpmn:definitions/>\n";
        assert_eq!(strip_markdown_fences(raw), "<bpmn:definitions/>");
    }
}
