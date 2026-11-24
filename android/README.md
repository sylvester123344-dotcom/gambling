# Skyline Android forecast app

The Android app wraps the forecast-only view and bundles the website assets for offline use.

To build locally, use JDK 17, Android SDK platform 35, and Gradle 8.7:

```sh
gradle -p android :app:assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. The
`Build Android APK` GitHub Actions workflow publishes the debug APK as a
downloadable artifact after each branch push.
