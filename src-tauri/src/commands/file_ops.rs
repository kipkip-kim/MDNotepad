use serde::Serialize;

#[derive(Serialize)]
pub struct FileReadResult {
    content: String,
    encoding: String,
}

#[tauri::command]
pub fn read_file_with_encoding(path: String) -> Result<FileReadResult, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;

    // BOM detection
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return Ok(FileReadResult {
            content: String::from_utf8_lossy(&bytes[3..]).to_string(),
            encoding: "UTF-8 BOM".into(),
        });
    }

    // Try UTF-8 first
    if let Ok(s) = String::from_utf8(bytes.clone()) {
        return Ok(FileReadResult {
            content: s,
            encoding: "UTF-8".into(),
        });
    }

    // Auto-detect encoding with chardetng
    let mut detector = chardetng::EncodingDetector::new();
    detector.feed(&bytes, true);
    let encoding = detector.guess(None, true);
    let (decoded, _, _) = encoding.decode(&bytes);

    Ok(FileReadResult {
        content: decoded.to_string(),
        encoding: encoding.name().to_string(),
    })
}

#[tauri::command]
pub fn write_file_with_encoding(
    path: String,
    content: String,
    encoding: String,
    line_ending: String,
) -> Result<(), String> {
    // Normalize line endings first to avoid double conversion
    let normalized = content.replace("\r\n", "\n");
    let content = if line_ending == "CRLF" {
        normalized.replace('\n', "\r\n")
    } else {
        normalized
    };

    let bytes = match encoding.as_str() {
        "UTF-8" => content.into_bytes(),
        "UTF-8 BOM" => {
            let mut bom = vec![0xEF, 0xBB, 0xBF];
            bom.extend(content.as_bytes());
            bom
        }
        other => {
            let enc = encoding_rs::Encoding::for_label(other.as_bytes())
                .ok_or_else(|| format!("Unknown encoding: {}", other))?;
            let (encoded, _, _) = enc.encode(&content);
            encoded.to_vec()
        }
    };

    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn atomic_rename(from: String, to: String) -> Result<(), String> {
    std::fs::rename(&from, &to).map_err(|e| e.to_string())
}
