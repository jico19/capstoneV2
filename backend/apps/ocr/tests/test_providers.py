"""Unit tests for OCR provider abstraction layer (providers.py).

All tests are fully offline — no real network calls are made.
Uses unittest.mock to patch requests.post / requests.get.
"""
import json
import pytest
from unittest.mock import MagicMock, patch, call

from apps.ocr.providers import (
    OCRSpaceProvider,
    PaddleOCRProvider,
    OCRProviderError,
    RateLimitError,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(status_code=200, json_body=None, text=''):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_body or {}
    resp.text = text
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


# ---------------------------------------------------------------------------
# OCRSpaceProvider tests
# ---------------------------------------------------------------------------

class TestOCRSpaceProvider:
    @patch('apps.ocr.providers.requests.post')
    def test_extract_text_from_url(self, mock_post, settings):
        settings.OCR_URL = 'https://api.ocr.space/parse/image'
        settings.OCR_API_KEY = 'testkey'
        mock_post.return_value = _make_response(json_body={
            'OCRExitCode': 1,
            'ParsedResults': [{'ParsedText': 'Handler License\nJuan Dela Cruz'}]
        })
        provider = OCRSpaceProvider()
        text = provider.extract_text(file_url='https://example.com/doc.jpg')
        assert 'Juan Dela Cruz' in text

    @patch('apps.ocr.providers.requests.post')
    def test_rate_limit_429_raises(self, mock_post, settings):
        settings.OCR_URL = 'https://api.ocr.space/parse/image'
        settings.OCR_API_KEY = 'testkey'
        mock_post.return_value = _make_response(status_code=429)
        mock_post.return_value.raise_for_status = MagicMock()
        provider = OCRSpaceProvider()
        with pytest.raises(RateLimitError):
            provider.extract_text(file_url='https://example.com/doc.jpg')

    @patch('apps.ocr.providers.requests.post')
    def test_api_error_raises(self, mock_post, settings):
        settings.OCR_URL = 'https://api.ocr.space/parse/image'
        settings.OCR_API_KEY = 'testkey'
        mock_post.return_value = _make_response(json_body={
            'OCRExitCode': 2,
            'ErrorMessage': 'File too large'
        })
        provider = OCRSpaceProvider()
        with pytest.raises(OCRProviderError, match='File too large'):
            provider.extract_text(file_url='https://example.com/doc.jpg')

    @patch('apps.ocr.providers.requests.post')
    def test_rate_limit_in_error_message(self, mock_post, settings):
        settings.OCR_URL = 'https://api.ocr.space/parse/image'
        settings.OCR_API_KEY = 'testkey'
        mock_post.return_value = _make_response(json_body={
            'OCRExitCode': 3,
            'ErrorMessage': 'Rate limit exceeded'
        })
        provider = OCRSpaceProvider()
        with pytest.raises(RateLimitError):
            provider.extract_text(file_url='https://example.com/doc.jpg')


# ---------------------------------------------------------------------------
# PaddleOCRProvider tests
# ---------------------------------------------------------------------------

class TestPaddleOCRProvider:

    def _submit_response(self, job_id='job123'):
        return _make_response(json_body={
            'code': 0,
            'msg': 'Success',
            'data': {'jobId': job_id}
        })

    def _poll_success(self, texts=None):
        return _make_response(json_body={
            'code': 0,
            'data': {
                'status': 'success',
                'result': {
                    'ocrResults': [{'rec_texts': texts or ['Line 1', 'Line 2']}]
                }
            }
        })

    def _poll_pending(self):
        return _make_response(json_body={
            'code': 0,
            'data': {'status': 'pending'}
        })

    @patch('apps.ocr.providers.time.sleep', return_value=None)  # skip real sleep
    @patch('apps.ocr.providers.requests.get')
    @patch('apps.ocr.providers.requests.post')
    def test_successful_job_with_file_url(self, mock_post, mock_get, mock_sleep, settings):
        settings.PADDLE_OCR_URL = 'https://paddleocr.aistudio-app.com/api/v2/ocr/jobs'
        settings.PADDLE_OCR_TOKEN = 'tok123'
        # requests.get called twice: once to download, once to poll
        download_resp = MagicMock()
        download_resp.status_code = 200
        download_resp.content = b'fake-image-bytes'
        download_resp.raise_for_status = MagicMock()
        poll_resp = self._poll_success(['Trader Pass', 'Juan Cruz'])
        mock_get.side_effect = [download_resp, poll_resp]
        mock_post.return_value = self._submit_response()

        provider = PaddleOCRProvider()
        text = provider.extract_text(file_url='https://cdn.example.com/traders_pass.jpg')
        assert 'Trader Pass' in text
        assert 'Juan Cruz' in text

    @patch('apps.ocr.providers.time.sleep', return_value=None)
    @patch('apps.ocr.providers.requests.get')
    @patch('apps.ocr.providers.requests.post')
    def test_polls_until_success(self, mock_post, mock_get, mock_sleep, settings):
        settings.PADDLE_OCR_URL = 'https://paddleocr.aistudio-app.com/api/v2/ocr/jobs'
        settings.PADDLE_OCR_TOKEN = 'tok123'
        download_resp = MagicMock()
        download_resp.content = b'data'
        download_resp.raise_for_status = MagicMock()
        mock_get.side_effect = [download_resp, self._poll_pending(), self._poll_success()]
        mock_post.return_value = self._submit_response()

        provider = PaddleOCRProvider()
        text = provider.extract_text(file_url='https://cdn.example.com/doc.jpg')
        assert 'Line 1' in text
        # Two poll calls (pending then success)
        assert mock_get.call_count == 3  # 1 download + 2 polls

    @patch('apps.ocr.providers.time.sleep', return_value=None)
    @patch('apps.ocr.providers.requests.get')
    @patch('apps.ocr.providers.requests.post')
    def test_job_failed_raises(self, mock_post, mock_get, mock_sleep, settings):
        settings.PADDLE_OCR_URL = 'https://paddleocr.aistudio-app.com/api/v2/ocr/jobs'
        settings.PADDLE_OCR_TOKEN = 'tok123'
        download_resp = MagicMock()
        download_resp.content = b'data'
        download_resp.raise_for_status = MagicMock()
        failed_resp = _make_response(json_body={
            'code': 0, 'data': {'status': 'failed', 'error': 'Unsupported format'}
        })
        mock_get.side_effect = [download_resp, failed_resp]
        mock_post.return_value = self._submit_response()

        provider = PaddleOCRProvider()
        with pytest.raises(OCRProviderError, match='failed'):
            provider.extract_text(file_url='https://cdn.example.com/doc.jpg')

    @patch('apps.ocr.providers.requests.post')
    def test_rate_limit_on_submit_raises(self, mock_post, settings):
        settings.PADDLE_OCR_URL = 'https://paddleocr.aistudio-app.com/api/v2/ocr/jobs'
        settings.PADDLE_OCR_TOKEN = 'tok123'
        resp = _make_response(status_code=429)
        resp.raise_for_status = MagicMock()
        mock_post.return_value = resp

        # Bypass download call for local file_obj test
        provider = PaddleOCRProvider()
        with pytest.raises(RateLimitError):
            import io
            provider.extract_text(file_obj=io.BytesIO(b'data'), filename='test.jpg')

    def test_missing_url_config_raises(self, settings):
        settings.PADDLE_OCR_URL = ''
        provider = PaddleOCRProvider()
        with pytest.raises(OCRProviderError, match='PADDLE_OCR_URL'):
            provider.extract_text(file_url='https://example.com/doc.jpg')

    def test_parse_result_ocrResults_format(self):
        provider = PaddleOCRProvider()
        data = {
            'data': {
                'status': 'success',
                'result': {
                    'ocrResults': [
                        {'rec_texts': ['Name: Juan', 'Date: 2025-01-01']},
                        {'rec_texts': ['Signature']},
                    ]
                }
            }
        }
        text = provider._parse_result(data)
        assert 'Name: Juan' in text
        assert 'Signature' in text

    def test_parse_result_flat_texts_format(self):
        provider = PaddleOCRProvider()
        data = {'data': {'result': {'texts': ['Line A', 'Line B']}}}
        text = provider._parse_result(data)
        assert 'Line A\nLine B' == text
