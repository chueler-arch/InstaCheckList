# Pro data model draft

This is the initial Firestore boundary, not a deployed Firebase configuration.

```text
organizations/{organizationId}
  members/{userId}
  guests/{guestId}
  templates/{templateId}
    items/{itemId}
  projects/{projectId}
    items/{itemId}
    devices/{deviceId}
      results/{itemId}
      values/{valueId}
      photos/{photoId}
```

All documents carry `organizationId`. Project access is checked through membership and a project assignment. Guest records also carry `projectId` and `expiresAt`; access must fail after expiry. Photos store metadata in Firestore while the binary and thumbnails live in Cloud Storage.

Stable IDs are mandatory for projects, templates, items and devices. Display order and titles are mutable and must never be used as relational keys. Historical results retain both actor UID (when available) and the display name captured at the time of work.

The final collection shape must be validated against expected query patterns and Security Rules before Firebase resources are created.
