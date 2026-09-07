//! Presentation-only locale settings. Machine codes and format data stay stable.
use std::env;
use tessembly_core::{Error, Result};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Language {
    En,
    Ko,
}

pub fn resolve(value: &str) -> Language {
    let primary = value
        .trim()
        .split(['-', '_', '.', '@', ':'])
        .next()
        .unwrap_or("");
    if primary.eq_ignore_ascii_case("ko") {
        Language::Ko
    } else {
        Language::En
    }
}
fn from_settings(mut get: impl FnMut(&str) -> Option<String>) -> Language {
    for key in [
        "TESSEMBLY_LANG",
        "LC_ALL",
        "LC_MESSAGES",
        "LANG",
        "LANGUAGE",
    ] {
        if let Some(value) = get(key).filter(|v| !v.trim().is_empty() && v != "auto") {
            return resolve(&value);
        }
    }
    Language::En
}
pub fn detect() -> Language {
    from_settings(|key| env::var(key).ok())
}
pub fn arguments(args: &mut Vec<String>) -> Result<Language> {
    let Some(index) = args.iter().position(|v| v == "--lang") else {
        return Ok(detect());
    };
    let value = args
        .get(index + 1)
        .ok_or_else(|| Error::new("INVALID_ARGUMENTS"))?
        .clone();
    if !matches!(value.as_str(), "en" | "ko" | "auto") {
        return Err(Error::new("INVALID_ARGUMENTS"));
    }
    args.drain(index..=index + 1);
    if args.iter().any(|v| v == "--lang") {
        return Err(Error::new("INVALID_ARGUMENTS"));
    }
    Ok(if value == "auto" {
        detect()
    } else {
        resolve(&value)
    })
}
pub fn help(language: Language) -> &'static str {
    match language {
        Language::Ko => include_str!("../../../docs/HELP.ko.md"),
        Language::En => include_str!("../../../docs/HELP.en.md"),
    }
}
pub fn message(code: &str, language: Language) -> &'static str {
    let pair = match code {
        "INVALID_ARGUMENTS" => ("Invalid arguments.", "인수가 올바르지 않습니다."),
        "PROFILE_REQUIRED" => ("Specify a semantic profile.", "의미 프로필을 지정하세요."),
        "UNSUPPORTED_PROFILE" => (
            "Unsupported semantic profile.",
            "지원하지 않는 의미 프로필입니다.",
        ),
        "MIGRATION_REQUIRES_METADATA_HANDLER" => (
            "Unknown metadata needs a profile-aware migration handler.",
            "알 수 없는 메타데이터에는 프로필을 아는 별도 이관 처리가 필요합니다.",
        ),
        "CONFIG_CONFLICT" => (
            "Document and host settings conflict.",
            "문서와 호스트 설정이 충돌합니다.",
        ),
        "READ_FAILED" => ("Could not read the file.", "파일을 읽을 수 없습니다."),
        "WRITE_FAILED" => ("Could not write the file.", "파일을 쓸 수 없습니다."),
        "OPAQUE_METADATA_WOULD_BE_LOST" => (
            "Text export would lose opaque metadata.",
            "텍스트 변환 시 불투명 메타데이터가 유실됩니다.",
        ),
        _ if code.ends_with("LIMIT") || code == "INCOMPLETE" => (
            "Processing limit reached; not an impossibility proof.",
            "처리 한도를 초과했습니다. 불가능 판정이 아닙니다.",
        ),
        _ if code.starts_with("UNSUPPORTED") || code.ends_with("REQUIRES_HOST") => (
            "The host must support this feature or state.",
            "이 기능이나 상태는 호스트의 지원이 필요합니다.",
        ),
        _ => (
            "Input does not meet the format contract. Check the code and byte span.",
            "입력이 형식 계약에 맞지 않습니다. 오류 코드와 바이트 위치를 확인하세요.",
        ),
    };
    if language == Language::Ko {
        pair.1
    } else {
        pair.0
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn primary_language_only() {
        for value in ["ko", "KO-kr", "ko_KR.UTF-8"] {
            assert_eq!(resolve(value), Language::Ko);
        }
        for value in ["en-US", "ja", "kok", "C", "POSIX", "en:ko", ""] {
            assert_eq!(resolve(value), Language::En);
        }
    }
    #[test]
    fn environment_precedence_is_not_secondary_language_search() {
        assert_eq!(
            from_settings(|k| match k {
                "LC_ALL" => Some("C".into()),
                "LANG" => Some("ko_KR".into()),
                _ => None,
            }),
            Language::En
        );
    }
}
