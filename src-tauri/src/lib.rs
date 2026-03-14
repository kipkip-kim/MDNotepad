use tauri::Manager;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::file_ops::read_file_with_encoding,
            commands::file_ops::write_file_with_encoding,
            commands::file_ops::atomic_rename,
            commands::file_ops::is_portable,
            commands::file_ops::get_portable_dir,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main")
                .ok_or("Failed to get main window")?;

            #[cfg(target_os = "windows")]
            apply_window_effect(&window);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "windows")]
fn apply_window_effect(window: &tauri::WebviewWindow) {
    use window_vibrancy::{apply_acrylic, apply_mica};

    if is_windows_11() {
        let _ = apply_mica(window, None);
    } else {
        // Use a neutral, semi-transparent tint that works for both light and dark themes
        let _ = apply_acrylic(window, Some((243, 243, 243, 180)));
    }
}

#[cfg(target_os = "windows")]
fn is_windows_11() -> bool {
    // Read build number from registry
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    if let Ok(output) = Command::new("reg")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion",
            "/v",
            "CurrentBuildNumber",
        ])
        .output()
    {
        let out = String::from_utf8_lossy(&output.stdout);
        // Output format: "    CurrentBuildNumber    REG_SZ    22621"
        if let Some(val) = out.split_whitespace().last() {
            if let Ok(build) = val.parse::<u32>() {
                return build >= 22000;
            }
        }
    }
    false
}
