"""OCR provider abstraction layer.

Defines a clean interface for OCR providers (PaddleOCR AI Studio and OCR.space).
Provider selection and fallback chain are managed by tasks.py.
"""
import logging
import time
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


class PaddleOCRProvider:
    """PaddleOCR AI Studio async jobs API.

    Flow:
      1. POST /api/v2/ocr/jobs  (multipart/form-data)  → jobId
      2. GET  /api/v2/ocr/jobs/{jobId}  (poll until success/failed)
      3. Extract rec_texts from the result

    Auth: Authorization: Bearer <PADDLE_OCR_TOKEN>
    """

    POLL_INTERVAL = 2   # seconds between status checks
    POLL_TIMEOUT = 30   # max seconds to wait for a job to complete

    def extract_text(self, *, file_url=None, file_obj=None, filename=None) -> str:
        api_url = getattr(settings, 'PADDLE_OCR_URL', '').rstrip('/')
        token = getattr(settings, 'PADDLE_OCR_TOKEN', '')

        if not api_url or not token:
            raise OCRProviderError("PADDLE_OCR_URL or PADDLE_OCR_TOKEN is not configured in settings.")

        headers = {"Authorization": f"Bearer {token}"}

        try:
            # --- Step 1: Submit the job ---
            if file_url and file_url.startswith('http'):
                # Download the file content so we can multipart-upload it
                img_resp = requests.get(file_url, timeout=15)
                img_resp.raise_for_status()
                file_bytes = img_resp.content
                fname = filename or file_url.split('/')[-1] or 'document'
            elif file_obj:
                file_bytes = file_obj.read()
                fname = filename or 'document'
            else:
                raise OCRProviderError("No file URL or file object provided for PaddleOCR.")

            # Always multipart — sending JSON body causes 500 on this endpoint
            files = {'file': (fname, file_bytes)}
            data = {'model': 'PaddleOCR-json'}  # lightweight model; swap to PaddleOCR-VL-1.6 if needed

            submit_resp = requests.post(
                api_url, headers=headers, files=files, data=data, timeout=15
            )

            if submit_resp.status_code == 429:
                raise RateLimitError("PaddleOCR rate limit reached (HTTP 429).")

            submit_resp.raise_for_status()
            submit_data = submit_resp.json()

            # Check API-level error
            if submit_data.get('code', 0) != 0:
                msg = submit_data.get('msg', f"Submit error code {submit_data.get('code')}")
                if any(kw in msg.lower() for kw in ('rate limit', 'quota', 'exceeded')):
                    raise RateLimitError(msg)
                raise OCRProviderError(f"PaddleOCR submit error: {msg}")

            job_id = submit_data.get('data', {}).get('jobId')
            if not job_id:
                raise OCRProviderError(
                    f"PaddleOCR did not return a jobId. Response: {submit_data}"
                )

            logger.info(f"PaddleOCR job submitted: {job_id}")

            # --- Step 2: Poll for result ---
            result_url = f"{api_url}/{job_id}"
            elapsed = 0

            while elapsed < self.POLL_TIMEOUT:
                time.sleep(self.POLL_INTERVAL)
                elapsed += self.POLL_INTERVAL

                poll_resp = requests.get(result_url, headers=headers, timeout=15)

                if poll_resp.status_code == 429:
                    raise RateLimitError("PaddleOCR rate limit reached while polling.")

                poll_resp.raise_for_status()
                poll_data = poll_resp.json()

                job_status = (
                    poll_data.get('data', {}).get('status') or
                    poll_data.get('status', 'pending')
                )

                if job_status == 'success':
                    return self._parse_result(poll_data)

                if job_status == 'failed':
                    err = poll_data.get('data', {}).get('error') or 'Job failed with no error detail'
                    raise OCRProviderError(f"PaddleOCR job {job_id} failed: {err}")

                logger.debug(f"PaddleOCR job {job_id} status: {job_status} ({elapsed}s elapsed)")

            raise OCRProviderError(
                f"PaddleOCR job {job_id} timed out after {self.POLL_TIMEOUT}s."
            )

        except (RateLimitError, OCRProviderError):
            raise
        except Exception as e:
            raise OCRProviderError(f"PaddleOCR request failed: {str(e)}") from e

    def _parse_result(self, poll_data: dict) -> str:
        """Extract plain newline-separated text from a completed job response.

        Standard shape: poll_data['data']['result']['ocrResults'][]['rec_texts']
        """
        data_block = poll_data.get('data', {})
        result = data_block.get('result') or data_block

        if isinstance(result, dict):
            # Primary: result.ocrResults[].rec_texts
            ocr_results = result.get('ocrResults') or result.get('ocr_results')
            if isinstance(ocr_results, list):
                lines = []
                for item in ocr_results:
                    if isinstance(item, dict):
                        lines.extend(item.get('rec_texts', []))
                if lines:
                    return '\n'.join(lines)

            # Fallback A: result.texts or result.rec_texts
            texts = result.get('texts') or result.get('rec_texts')
            if isinstance(texts, list):
                return '\n'.join(str(t) for t in texts)

            # Fallback B: markdown or content key (PP-Structure/VL models)
            markdown = result.get('markdown') or result.get('content') or result.get('text')
            if markdown:
                return str(markdown)

        # Fallback C: flat list at result level
        if isinstance(result, list):
            lines = []
            for item in result:
                if isinstance(item, dict):
                    lines.append(item.get('text') or item.get('rec_text') or '')
                elif isinstance(item, str):
                    lines.append(item)
            return '\n'.join(l for l in lines if l)

        raise OCRProviderError(
            f"Cannot extract text from PaddleOCR result. "
            f"Keys present: {list(result.keys()) if isinstance(result, dict) else type(result).__name__}"
        )
