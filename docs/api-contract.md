# JIM-Connect Mobile API Contract

Base URL is configured by `EXPO_PUBLIC_API_BASE_URL`.

All endpoints should return JSON over HTTPS. The mobile app is read-only in v1.0 and does not send student personal data.

## GET `/events/upcoming`

Returns upcoming published events sorted nearest first.

```json
[
  {
    "id": "e1",
    "name": "Campus Leadership Conclave",
    "startsAt": "2026-05-18T10:00:00+05:30",
    "endsAt": "2026-05-18T16:00:00+05:30",
    "venue": "Main Auditorium",
    "club": "Student Affairs",
    "image": "https://example.com/banner.jpg",
    "description": "Full event description.",
    "speakers": ["Dr. Rekha Attri"],
    "attachments": ["Program schedule"]
  }
]
```

Rules:
- `startsAt` and `endsAt` must be valid ISO date strings.
- `endsAt` must be after `startsAt`.
- Return only published events that have not ended.

## GET `/archive`

Returns past events in reverse chronological order. The app paginates locally in batches of 20, but the backend may later add server pagination.

```json
[
  {
    "id": "a1",
    "eventId": "past-1",
    "name": "Jaipuria Talent Night",
    "date": "2026-04-26",
    "club": "Cultural Committee",
    "year": "2026",
    "image": "https://example.com/archive.jpg",
    "summary": "At least 100 words...",
    "driveUrl": "https://drive.google.com/..."
  }
]
```

Rules:
- `summary` must contain at least 100 words.
- `driveUrl` must be an HTTPS Google Drive URL.
- Google Drive folders should be view-only shared links.

## GET `/hall-of-fame`

Returns administrator-managed winner profiles.

```json
[
  {
    "id": "w1",
    "name": "Aarav Mehta",
    "batch": "2025-27",
    "award": "Champion of the Year",
    "category": "Leadership",
    "club": "Student Affairs",
    "eventName": "Campus Leadership Conclave",
    "archiveId": "a1",
    "portrait": "https://example.com/portrait.jpg",
    "champion": true
  }
]
```

Rules:
- `archiveId` must match an archive entry returned by `/archive`.
- `portrait` should be a square-friendly image; the app displays it at 1:1.
- Students cannot create these entries from the mobile app.

## POST `/push/register`

Registers an Expo push token for future event-published notifications.

```json
{
  "token": "ExponentPushToken[...]",
  "platform": "ios"
}
```

Rules:
- Mobile clients call this after notification permission is granted.
- The API stores tokens and sends a notification when an admin publishes a new event.
