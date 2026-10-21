# Paperflow

Paperflow is a private, local-first document scanner built as a React + Vite PWA and wrapped with Capacitor for Android and iOS.

## What works in this MVP

- Capture a page with the device camera input or import one or more images.
- Build a multi-page document with page thumbnails.
- Apply Original, Magic, or Mono enhancement presets.
- Rotate or delete pages and rename documents.
- Persist scans locally on the device with `localStorage`.
- Export the current document as a multi-page PDF.
- Install the web app as a PWA and keep the app shell available offline.
- Generate native Android and iOS projects with Capacitor.

This is intentionally a small, usable first slice. It does not yet include automatic document-edge detection, perspective correction, OCR, cloud sync, or account login.

## Run locally

```bash
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm test
npm run build
```

## Capacitor projects

The Android and iOS projects are generated in this workspace so the repository can be opened and customized on the corresponding platform.

```bash
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
```

`cap:add:*` is only needed the first time. After changing the web app, run `npm run cap:sync` before opening a native project.

## GitHub Actions

The workflows under `.github/workflows/` run on pushes to `main` and manually from the Actions tab:

- **Build PWA / Web Artifact** — uploads the built `dist/` folder.
- **Build Android Unsigned APK** — uploads the unsigned release APK.
- **Build iOS Unsigned IPA** — archives the iOS app without Apple signing and uploads an `.ipa` wrapper.

The iOS artifact is intentionally unsigned. A normal physical iPhone will not install an unsigned IPA directly; it must be re-signed with a provisioning profile or passed through a sideloading tool that performs signing for the test device. App Store distribution requires a separate signed archive and Apple Developer credentials.

The workflows create a missing native project automatically, then run `npx cap sync` so the web build is included in the platform artifact.
