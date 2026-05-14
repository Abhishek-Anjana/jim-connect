# JIM-Connect

Cross-platform mobile app for Jaipuria Institute of Management, Indore, built from `JIM_Connect_PRD.docx`.

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript

## App Scope

- Events tab: upcoming event cards, club filters, event detail view
- Archive tab: searchable past events, 20-entry pagination, Google Drive repository links
- Hall of Fame tab: champion highlights, winner profiles, batch/category/club filters, archive cross-links

The current build uses local sample content in `src/data/content.ts`. That file is intentionally shaped like API response data so it can later be replaced by a REST service without redesigning the UI.

## Configure API

Copy `.env.example` to `.env` and set the REST API base URL when the backend is ready.

```powershell
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

If the value is empty, the app uses local PRD sample content and keeps working offline.

The expected REST shapes are documented in `docs/api-contract.md`.

## Run Locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the project in Expo Go, an Android emulator, or an iOS simulator. On Windows, use `npm.cmd` because PowerShell may block the `npm.ps1` shim.

For browser QA in Codex or a desktop browser:

```powershell
npm.cmd run start:web
```

Then open `http://localhost:8081`.

The Administrator Portal runs from the API server at `http://localhost:3001/admin`.
Log in with the development token `jim-admin-dev` unless `ADMIN_TOKEN` is set before starting the API.

Local admin tokens:
- Super Admin: `jim-admin-dev`
- Content Manager: `jim-content-dev`
- Read-Only Viewer: `jim-viewer-dev`

To check whether both servers are alive:

```powershell
npm.cmd run health
```

## Verify

```powershell
npm.cmd run verify
```

Or run the individual checks:

```powershell
npm.cmd run typecheck
npm.cmd run doctor
npm.cmd run audit:moderate
npm.cmd run validate:content
npm.cmd run test:date
npm.cmd run test:content
npm.cmd run test:guards
npm.cmd run test:cache
npm.cmd run test:api
npm.cmd run export:android
npm.cmd run export:ios
npm.cmd run export:web
```

See `docs/release-checklist.md` before sharing a candidate build.

## Build Android And iOS

Install and log in to EAS, then use the build profiles in `eas.json`.

```powershell
npx.cmd eas login
npx.cmd eas build --platform android --profile preview
npx.cmd eas build --platform ios --profile preview
```

For store-ready builds:

```powershell
npx.cmd eas build --platform android --profile production
npx.cmd eas build --platform ios --profile production
```

## Next Product Steps

- Connect Events, Archive, and Hall of Fame data to the planned REST API.
- Add the Administrator Portal from the PRD as a separate web app.
- Add push notifications for Phase 1.1 after event publishing exists in the backend.
