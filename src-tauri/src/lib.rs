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
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

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
        let _ = apply_acrylic(window, Some((18, 18, 18, 125)));
    }
}

#[cfg(target_os = "windows")]
fn is_windows_11() -> bool {
    use std::process::Command;
    // Use `ver` command to get Windows version, check build >= 22000
    if let Ok(output) = Command::new("cmd").args(["/C", "ver"]).output() {
        let version_str = String::from_utf8_lossy(&output.stdout);
        // Format: "Microsoft Windows [Version 10.0.22621.xxxx]"
        if let Some(start) = version_str.find("10.0.") {
            let after = &version_str[start + 5..];
            if let Some(end) = after.find(|c: char| !c.is_ascii_digit()) {
                if let Ok(build) = after[..end].parse::<u32>() {
                    return build >= 22000;
                }
            }
        }
    }
    false
}
