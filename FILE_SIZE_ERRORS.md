# File Size Limit Documentation

To maintain system performance and storage efficiency, a global limit of **30MB** has been implemented for all document uploads within the LivestockPass system.

## Enforcement Points

### 1. Frontend Validation (Client-Side)
Files are checked before being sent to the server. If a file exceeds 30MB, the upload is blocked, and an error message is displayed in the UI.

- **Farmer Application:** Displays a bold red error message: `File size cannot exceed 30MB`.
- **OPV Approval:** Displays a similar error message below the VHC or Transportation Pass upload fields.
- **Inspector QR Scanner:** Shows a browser alert if an uploaded QR image is too large.

### 2. Backend Validation (Server-Side)
The backend provides two layers of protection:
- **Serializer Validation:** Immediate feedback during API requests.
- **Model Validation:** Final safety guard at the database layer.

## Error Response Format

When a file exceeds the limit, the API returns a `400 Bad Request` status with a structured error message.

### Standard Error Response
```json
{
    "error": "Failed to create application",
    "detail": {
        "file": ["File size cannot exceed 30MB."]
    }
}
```

### Specific Field Errors (OPV Validation)
```json
{
    "error": "Error saving OPV validation",
    "detail": {
        "veterinary_health_certificate": ["Veterinary Health Certificate size cannot exceed 30MB."],
        "transportation_pass": ["Transportation Pass size cannot exceed 30MB."]
    }
}
```

## Technical Details
- **Limit:** 31,457,280 bytes (30 MiB).
- **Validator:** `apps.permits.models.validate_file_size`
- **Frontend Logic:** Checks `file.size` against `30 * 1024 * 1024`.
