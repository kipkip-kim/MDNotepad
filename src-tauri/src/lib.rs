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
        // Use a highly transparent tint so both light and dark themes show through
        let _ = apply_acrylic(window, Some((128, 128, 128, 40)));
    }
}

#[cfg(target_os = "windows")]
fn is_windows_11() -> bool {
    use windows_sys::Win32::System::Registry::{
        RegOpenKeyExW, RegQueryValueExW, RegCloseKey, HKEY_LOCAL_MACHINE, KEY_READ, REG_SZ, HKEY,
    };

    unsafe {
        let subkey: Vec<u16> = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\0"
            .encode_utf16()
            .collect();
        let value_name: Vec<u16> = "CurrentBuildNumber\0".encode_utf16().collect();

        let mut hkey: HKEY = std::ptr::null_mut();
        if RegOpenKeyExW(HKEY_LOCAL_MACHINE, subkey.as_ptr(), 0, KEY_READ, &mut hkey) != 0 {
            return false;
        }

        let mut data = [0u8; 64];
        let mut data_size = data.len() as u32;
        let mut data_type = 0u32;
        let result = RegQueryValueExW(
            hkey,
            value_name.as_ptr(),
            std::ptr::null(),
            &mut data_type,
            data.as_mut_ptr(),
            &mut data_size,
        );
        RegCloseKey(hkey);

        if result != 0 || data_type != REG_SZ {
            return false;
        }

        // Convert UTF-16 LE bytes to string
        let len = (data_size as usize) / 2;
        let wide: &[u16] = std::slice::from_raw_parts(data.as_ptr() as *const u16, len);
        // Trim null terminator
        let s = String::from_utf16_lossy(wide).trim_end_matches('\0').to_string();
        if let Ok(build) = s.parse::<u32>() {
            return build >= 22000;
        }
    }
    false
}
