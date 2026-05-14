# JIM-Connect Release Checklist

Use this before handing a build to Student Affairs, QA, or store submission.

## Content

- All upcoming events have valid start/end times, venue, club, description, and HTTPS banner image.
- Archive entries have at least 100 words and a verified view-only Google Drive folder URL.
- Hall of Fame winners link to matching Archive entries.
- Portraits and event images are approved for public display.

## Local Verification

```powershell
npm.cmd run verify
npm.cmd run export:web
npm.cmd run export:android
npm.cmd run export:ios
```

## Device QA

- Android: verify Events, Archive, Hall of Fame, filters, search, detail screens, and Google Drive link opening.
- iOS: repeat the same workflow and check safe-area spacing around header and bottom tabs.
- Offline: open once online, disable network, reopen app, and confirm cached content appears.
- Accessibility: confirm touch targets are comfortable and text remains readable with larger device font settings.

## Store Preparation

- Confirm `app.json` bundle identifiers.
- Replace sample image/content data with approved production API data.
- Verify the Admin Portal can publish an event and the API records a push notification dispatch.
- Verify role access: Super Admin can manage users, Content Manager can manage content, Read-Only Viewer cannot save changes.
- Generate production EAS builds using `eas.json`.
- Capture store screenshots from real or simulator devices.
