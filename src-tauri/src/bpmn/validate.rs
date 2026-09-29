use crate::error::AppError;

/// Lightweight gate used before a diagram is written to disk or returned to the canvas.
/// Structural BPMN checks live next to the modeler; this only rejects obvious non-BPMN payloads.
pub fn validate_bpmn_xml(xml: &str) -> Result<(), AppError> {
    let trimmed = xml.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidBpmn("document is empty".into()));
    }
    if !trimmed.starts_with('<') {
        return Err(AppError::InvalidBpmn("document is not XML".into()));
    }
    if !trimmed.contains("definitions") {
        return Err(AppError::InvalidBpmn(
            "missing BPMN definitions element".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_bpmn_xml;

    #[test]
    fn accepts_a_definitions_document() {
        let xml = r#"<?xml version="1.0"?><bpmn:definitions id="Definitions_1"></bpmn:definitions>"#;
        assert!(validate_bpmn_xml(xml).is_ok());
    }

    #[test]
    fn rejects_empty_and_non_bpmn_text() {
        assert!(validate_bpmn_xml("   ").is_err());
        assert!(validate_bpmn_xml("<html></html>").is_err());
        assert!(validate_bpmn_xml("definitions without tags").is_err());
    }
}
