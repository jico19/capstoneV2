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

