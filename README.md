# RidgeRush Racing

A mobile-friendly, original side-scrolling hill driving game with touch controls, coin collection, fuel, speed HUD, and a landscape-friendly layout. It is inspired by the hill-racing genre, but uses its own name and original visual design.

## Run locally
1. Install Node.js 20 or newer.
2. In this folder run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the local address Vite prints.

## Build Android APK on GitHub
1. Create a new GitHub repository.
2. Upload the **contents** of this folder to the repository root. Do not upload the ZIP as a single file.
3. Make sure `package.json`, `index.html`, `src/`, `capacitor.config.json`, and `.github/` are at the root.
4. Open **Actions** → **Build RidgeRush Racing Android APK** → **Run workflow**.
5. When the workflow finishes successfully, open the run and download the artifact named `RidgeRush-Racing-debug-apk`. It contains `app-debug.apk`.

The workflow creates the Android project during the build, so you do not need to upload an `android/` folder yourself.

## Controls
- Hold **THROTTLE** to accelerate.
- Hold **BRAKE** to slow down.
- Keyboard: `D` / right arrow to accelerate, `A` / left arrow to brake.
- Use the pause button to pause or resume.
