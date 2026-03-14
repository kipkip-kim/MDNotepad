use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct FileReadResult {
    content: String,
    encoding: String,
}

/// Validate and canonicalize a file path to prevent path traversal attacks.
/// Blocks device paths, system directories, and executable extensions.
fn validate_file_path(path: &str) -> Result<std::path::PathBuf, String> {
    // Block device paths (Windows: \\.\, \\?\, CON, NUL, etc.)
    let upper = path.to_uppercase();
    if upper.starts_with("\\\\.\\") || upper.starts_with("\\\\?\\") {
        return Err("Device paths are not allowed".into());
    }

    // Block Windows reserved device names
    let file_stem = Path::new(path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_uppercase();
    const RESERVED: &[&str] = &[
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if RESERVED.contains(&file_stem.as_str()) {
        return Err("Reserved device names are not allowed".into());
    }

    // Canonicalize to resolve .. and symlinks
    let canonical = std::fs::canonicalize(Path::new(path).parent().unwrap_or(Path::new(path)))
        .map_err(|e| format!("Invalid path: {}", e))?;
    let canonical = if Path::new(path).file_name().is_some() {
        canonical.join(Path::new(path).file_name().unwrap())
    } else {
        canonical
    };

    // Block dangerous file extensions for write operations
    let ext = canonical
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    const BLOCKED_EXTS: &[&str] = &[
        "exe", "dll", "sys", "drv", "bat", "cmd", "ps1", "vbs", "js",
        "msi", "scr", "com", "pif", "reg",
    ];
    if BLOCKED_EXTS.contains(&ext.as_str()) {
        return Err(format!("File type .{} is not allowed", ext));
    }

    Ok(canonical)
}

#[tauri::command]
pub fn read_file_with_encoding(path: String) -> Result<FileReadResult, String> {
    let validated = validate_file_path(&path)?;
    let bytes = std::fs::read(&validated).map_err(|e| e.to_string())?;

    // BOM detection
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return Ok(FileReadResult {
            content: String::from_utf8_lossy(&bytes[3..]).to_string(),
            encoding: "UTF-8 BOM".into(),
        });
    }

    // Try UTF-8 first (recover bytes on failure to avoid clone)
    let bytes = match String::from_utf8(bytes) {
        Ok(s) => {
            return Ok(FileReadResult {
                content: s,
                encoding: "UTF-8".into(),
            });
        }
        Err(e) => e.into_bytes(),
    };

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
            let (encoded, _, had_errors) = enc.encode(&content);
            if had_errors {
                return Err(format!(
                    "Some characters could not be encoded in {}",
                    other
                ));
            }
            encoded.to_vec()
        }
    };

    // Validate: for new files, canonicalize parent then join filename
    let p = Path::new(&path);
    let parent = p.parent().ok_or("Invalid file path")?;
    let parent_canonical = std::fs::canonicalize(parent)
        .map_err(|e| format!("Invalid path: {}", e))?;
    let validated = if let Some(fname) = p.file_name() {
        parent_canonical.join(fname)
    } else {
        return Err("Invalid file path".into());
    };

    // Check extension
    let ext = validated
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    const BLOCKED_EXTS: &[&str] = &[
        "exe", "dll", "sys", "drv", "bat", "cmd", "ps1", "vbs", "js",
        "msi", "scr", "com", "pif", "reg",
    ];
    if BLOCKED_EXTS.contains(&ext.as_str()) {
        return Err(format!("File type .{} is not allowed", ext));
    }

    std::fs::write(&validated, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_portable() -> bool {
    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return false,
    };
    let dir = match exe.parent() {
        Some(d) => d,
        None => return false,
    };
    dir.join("portable").exists()
}

#[tauri::command]
pub fn get_portable_dir() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("No parent directory")?;
    let data_dir = dir.join("data");
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn atomic_rename(from: String, to: String) -> Result<(), String> {
    let from_validated = validate_file_path(&from)?;
    let to_path = Path::new(&to);
    let to_parent = to_path.parent().ok_or("Invalid destination path")?;
    let to_parent_canonical = std::fs::canonicalize(to_parent)
        .map_err(|e| format!("Invalid destination path: {}", e))?;
    let to_validated = if let Some(fname) = to_path.file_name() {
        to_parent_canonical.join(fname)
    } else {
        return Err("Invalid destination path".into());
    };

    // On Windows, use MoveFileExW with MOVEFILE_REPLACE_EXISTING for atomic rename
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;
        let from_wide: Vec<u16> = from_validated.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
        let to_wide: Vec<u16> = to_validated.as_os_str().encode_wide().chain(std::iter::once(0)).collect();

        // MOVEFILE_REPLACE_EXISTING = 0x1
        let result = unsafe {
            windows_sys::Win32::Storage::FileSystem::MoveFileExW(
                from_wide.as_ptr(),
                to_wide.as_ptr(),
                0x1, // MOVEFILE_REPLACE_EXISTING
            )
        };
        if result == 0 {
            return Err(format!("Failed to rename file: error code {}", std::io::Error::last_os_error()));
        }
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::fs::rename(&from_validated, &to_validated).map_err(|e| e.to_string())
    }
}
