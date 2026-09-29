mod generate;
mod keychain;

pub use generate::generate_bpmn;
pub use keychain::{has_api_key, read_api_key, set_api_key};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    Openai,
    Claude,
}

impl AiProvider {
    pub fn keychain_account(self) -> &'static str {
        match self {
            Self::Openai => "openai",
            Self::Claude => "claude",
        }
    }
}
