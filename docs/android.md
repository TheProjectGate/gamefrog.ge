# Android Build & Sync

Capacitor wraps the existing Vite build so you can ship the web app inside a native Android shell.

## One-Time Setup

- `npm install @capacitor/core @capacitor/cli @capacitor/android`
- `npx cap init "gamefrog-ge" com.gamefrog.app --web-dir=dist`

## Regular Workflow

1. Build the web assets.
   ```
   npm run build
   ```
2. Copy the latest build into the native project (also syncs plugins).
   ```
   npx cap sync android
   ```
3. Open the Android project in Android Studio.
   ```
   npx cap open android
   ```

## Building APK / AAB

- From Android Studio: *Build ▸ Generate Signed Bundle / APK...*
- Or via CLI:
  ```
  cd android
  gradlew.bat assembleRelease
  ```

## Debugging & Testing

- Use Android Studio’s emulator or a USB device (`adb devices` to verify).
- Log output: *View ▸ Tool Windows ▸ Logcat*.
- Re-run steps 1–2 whenever frontend code changes.

## Pixel 8a Safe Areas & Battery Tips

- The app now ships with `viewport-fit=cover` and CSS safe-area variables (`--safe-area-top`, etc.) applied through the `.app-shell` wrapper. This keeps the UI clear of the front camera (hole-punch) and gesture regions.
- When testing on a Pixel 8a emulator, choose the device profile in *Device Manager* and ensure the layout doesn’t overlap the punch hole.
- A global `prefers-reduced-motion` rule is in `src/global.css`; users who enable Reduced Motion on Android will automatically see fewer animations, lowering GPU/battery usage.

