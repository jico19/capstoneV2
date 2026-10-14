"""OCR provider abstraction layer.

Defines a clean interface for OCR providers (OCR.space).
Provider selection and fallback chain are managed by tasks.py.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class OCRProviderError(Exception):
    """Base exception for provider-level OCR failures."""
    pass


class RateLimitError(OCRProviderError):
    """Raised when an OCR provider returns a 429 or quota limit error."""
    pass


class OCRSpaceProvider:
    """OCR.space provider — existing synchronous integration."""

    def extract_text(self, *, file_url=None, file_obj=None, filename=None) -> str:
        api_url = getattr(settings, 'OCR_URL', None) or 'https://api.ocr.space/parse/image'
        api_key = getattr(settings, 'OCR_API_KEY', '')

        # Detect filetype for better OCR accuracy (avoids guessing)
        fname = (filename or (file_url or '')).lower()
        if fname.endswith('.pdf'):
            filetype = 'PDF'
        elif fname.endswith('.png'):
            filetype = 'PNG'
        else:
            filetype = 'JPG'

        payload = {
            'apikey': api_key,
            'language': 'eng',
            'isOverlayRequired': False,
            'detectOrientation': False,
            'scale': False,
            'OCREngine': 2,
            'filetype': filetype,
        }

        try:
            if file_url and file_url.startswith('http'):
                payload['url'] = file_url
                resp = requests.post(api_url, data=payload, timeout=30)
            elif file_obj:
                files = {'file': (filename or 'document', file_obj)}
                resp = requests.post(api_url, data=payload, files=files, timeout=30)
            else:
                raise OCRProviderError("No file URL or file object provided for OCR.space.")

            if resp.status_code == 429:
                raise RateLimitError("OCR.space rate limit reached (HTTP 429).")

            resp.raise_for_status()
            data = resp.json()

            if data.get('OCRExitCode') != 1:
                err_msg = data.get('ErrorMessage', 'Unknown OCR.space API error')
                if any(kw in str(err_msg).lower() for kw in ('rate limit', 'too many requests')):
                    raise RateLimitError(err_msg)
                raise OCRProviderError(f"OCR.space API Error: {err_msg}")

            parsed_results = data.get('ParsedResults', [])
            if not parsed_results:
                raise OCRProviderError("No parsed results returned from OCR.space.")

            return parsed_results[0].get('ParsedText', '')

        except (RateLimitError, OCRProviderError):
            raise
        except Exception as e:
            raise OCRProviderError(f"OCR.space request failed: {str(e)}") from e


class GeminiDocumentParser:
    """Gemini Vision provider for direct structured document field extraction.

    Used as the high-accuracy rescue fallback when OCR.space + regex extraction
    fails or leaves missing required fields.
    """

    SCHEMAS = {
        'handlers_license': {
            'registration_number': "Registration number (e.g. 2025-DARFO-IV-A-003971)",
            'license_number': "Same as registration number",
            'name_of_applicant': "Full name of applicant/handler",
            'business_name': "Business or trade name",
            'address': "Business or applicant address",
            'area_of_coverage': "Area of coverage (e.g. All Regions, Region IV-A)",
            'date_of_issuance': "Issuance date (e.g. October 28, 2025)",
            'date_of_expiration': "Expiration date (e.g. October 28, 2026)"
        },
        'transport_carrier_reg': {
            'license_number': "License number (e.g. 2025-DARFO-IV-A-012243)",
            'name_of_applicant': "Full name of operator/applicant",
            'business_name': "Business or trade name",
            'address': "Business address",
            'plate_no': "Vehicle plate number (e.g. VDC 486)",
            'motor_vehicle_no': "Motor vehicle engine/chassis number if present, or null",
            'temporary_conduction_sticker': "Conduction sticker if present, or null",
            'maker_brand': "Maker or brand (e.g. ISUZU, REBUILT)",
            'body_type': "Body type (e.g. JITNEY, DROPSIDE, ALUMINUM VAN)",
            'date_of_issuance': "Issuance date (e.g. October 28, 2025)",
            'date_of_expiration': "Expiration date (e.g. October 28, 2026)"
        },
        'traders_pass': {
            'license_number': "Trader's Pass code (e.g. TrPASS-OPV-QZN-00014-V1)",
            'name_of_applicant': "Name of hauler or applicant",
            'business_name': "Name of business",
            'address': "Business address",
            'plate_no': "Plate number",
            'vehicle_type': "Type of vehicle",
            'date_of_issuance': "Issue date (e.g. 08/06/2025 or August 6, 2025)"
        },
        'cis': {
            'number_of_animals': "Integer count of pigs/swine shipped (e.g. 10)",
            'number_of_animals_text': "Pig count in words (e.g. TEN)",
            'origin': "Origin address/barangay",
            'shipment_date': "Shipment date in YYYY-MM-DD format",
            'destination': "Destination slaughterhouse/abattoir/address",
            'proprietor_name': "Proprietor or shipper full name",
            'business_name': "Business name if present, or null"
        },
        'endorsement_cert': {
            'barangay': "Originating barangay name (e.g. Janagdong 1)",
            'hauler_name': "Name of endorsed hauler or applicant",
            'official_name': "Name of Punong Barangay or certifying official",
            'official_position': "Official position (e.g. Punong Barangay)",
            'issue_date': "Issue date string if present, or null"
        }
    }

    @classmethod
    def get_api_url(cls):
        model = getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash')
        return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def extract_fields(self, *, file_bytes: bytes, mime_type: str, doc_type: str) -> dict:
        """Call Gemini Vision with inline document bytes and return parsed JSON fields."""
        import base64
        import json

        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            raise OCRProviderError("GEMINI_API_KEY is not configured.")

        schema = self.SCHEMAS.get(doc_type)
        if not schema:
            raise OCRProviderError(f"Document type '{doc_type}' is not supported by GeminiDocumentParser.")

        b64_data = base64.b64encode(file_bytes).decode('utf-8')

        system_instruction = (
            "You are an expert document parser for Philippine agricultural and livestock transport permits "
            "(Bureau of Animal Industry, Provincial Veterinary Office, and Sariaya Municipal Agriculture Office).\n"
            "Examine the attached official document image or PDF carefully and extract the requested fields.\n"
            "Return ONLY a valid JSON object matching the requested schema.\n"
            "Do not invent values; if a field cannot be found, set its value to null.\n"
            "Format dates as found or in standard 'Month DD, YYYY' format (or YYYY-MM-DD for CIS shipment_date)."
        )

        prompt = (
            f"Document Type: {doc_type}\n"
            f"Extract all relevant values matching this JSON schema:\n"
            f"{json.dumps(schema, indent=2)}\n"
            "Return valid JSON only, without markdown fences."
        )

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_data
                            }
                        },
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1000,
                "responseMimeType": "application/json"
            }
        }

        url = f"{self.get_api_url()}?key={api_key}"

        for attempt in range(2):
            try:
                res = requests.post(url, json=payload, timeout=25)
                if res.status_code == 429:
                    raise RateLimitError("Gemini API rate limit reached (HTTP 429).")
                if res.status_code in (500, 502, 503, 504) and attempt == 0:
                    import time
                    time.sleep(1)
                    continue

                res.raise_for_status()
                data = res.json()
                candidates = data.get('candidates', [])
                if not candidates:
                    raise OCRProviderError("No candidates returned from Gemini.")

                raw_text = candidates[0]['content']['parts'][0]['text'].strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                elif raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                parsed = json.loads(raw_text.strip())
                if isinstance(parsed, dict):
                    return parsed
                raise OCRProviderError(f"Unexpected Gemini response structure: expected dict, got {type(parsed)}")

            except (RateLimitError, OCRProviderError):
                raise
            except requests.RequestException as e:
                if attempt == 1:
                    raise OCRProviderError(f"Gemini API request failed: {e}") from e
            except json.JSONDecodeError as e:
                raise OCRProviderError(f"Failed to parse JSON from Gemini response: {e}") from e
            except Exception as e:
                raise OCRProviderError(f"Unexpected error in GeminiDocumentParser: {e}") from e

        raise OCRProviderError("GeminiDocumentParser exhausted retry attempts.")


