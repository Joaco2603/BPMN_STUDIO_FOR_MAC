use keyring::Entry;

use super::AiProvider;
use crate::error::AppError;

const SERVICE: &str = "BPMN Studio";

fn entry(provider: AiProvider) -> Result<Entry, AppError> {
    Entry::new(SERVICE, provider.keychain_account()).map_err(|error| {
        AppError::Keychain(error.to_string())
    })
}

pub fn set_api_key(provider: AiProvider, key: String) -> Result<(), AppError> {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return Err(AppError::Message("API key is empty".into()));
    }
    entry(provider)?
        .set_password(trimmed)
        .map_err(|error| AppError::Keychain(error.to_string()))
}

pub fn has_api_key(provider: AiProvider) -> Result<bool, AppError> {
    match entry(provider)?.get_password() {
        Ok(secret) => Ok(!secret.trim().is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(AppError::Keychain(error.to_string())),
    }
}

pub fn read_api_key(provider: AiProvider) -> Result<String, AppError> {
    match entry(provider)?.get_password() {
        Ok(secret) if !secret.trim().is_empty() => Ok(secret),
        Ok(_) | Err(keyring::Error::NoEntry) => Err(AppError::Message(format!(
            "no {} API key in the macOS keychain",
            provider.keychain_account()
        ))),
        Err(error) => Err(AppError::Keychain(error.to_string())),
    }
}
