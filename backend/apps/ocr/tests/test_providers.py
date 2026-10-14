"""Unit tests for OCR provider abstraction layer (providers.py).

All tests are fully offline — no real network calls are made.
Uses unittest.mock to patch requests.post / requests.get.
"""
import json
import pytest
from unittest.mock import MagicMock, patch, call

from apps.ocr.providers import (
    OCRSpaceProvider,
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
# GeminiDocumentParser tests
# ---------------------------------------------------------------------------

class TestGeminiDocumentParser:
    @patch('apps.ocr.providers.requests.post')
    def test_extract_fields_success(self, mock_post, settings):
        from apps.ocr.providers import GeminiDocumentParser
        settings.GEMINI_API_KEY = 'mock-gemini-key'
        mock_post.return_value = _make_response(
            status_code=200,
            json_body={
                'candidates': [
                    {
                        'content': {
                            'parts': [
                                {
                                    'text': json.dumps({
                                        'registration_number': '2025-DARFO-IV-A-003971',
                                        'license_number': '2025-DARFO-IV-A-003971',
                                        'name_of_applicant': 'DARREL C. AÑONUEVO',
                                        'business_name': 'DARREL AÑONUEVO TRUCKING SERVICES',
                                        'address': 'Poblacion San Antonio Quezon',
                                        'area_of_coverage': 'All Regions',
                                        'date_of_issuance': 'October 28, 2025',
                                        'date_of_expiration': 'October 28, 2026'
                                    })
                                }
                            ]
                        }
                    }
                ]
            }
        )
        parser = GeminiDocumentParser()
        result = parser.extract_fields(file_bytes=b'testbytes', mime_type='image/jpeg', doc_type='handlers_license')
        assert result['registration_number'] == '2025-DARFO-IV-A-003971'
        assert result['name_of_applicant'] == 'DARREL C. AÑONUEVO'

    @patch('apps.ocr.providers.requests.post')
    def test_extract_fields_rate_limit_429(self, mock_post, settings):
        from apps.ocr.providers import GeminiDocumentParser
        settings.GEMINI_API_KEY = 'mock-gemini-key'
        mock_post.return_value = _make_response(status_code=429)
        parser = GeminiDocumentParser()
        with pytest.raises(RateLimitError):
            parser.extract_fields(file_bytes=b'testbytes', mime_type='image/jpeg', doc_type='handlers_license')

    def test_extract_fields_missing_api_key(self, settings):
        from apps.ocr.providers import GeminiDocumentParser
        settings.GEMINI_API_KEY = ''
        parser = GeminiDocumentParser()
        with pytest.raises(OCRProviderError, match='GEMINI_API_KEY is not configured'):
            parser.extract_fields(file_bytes=b'testbytes', mime_type='image/jpeg', doc_type='handlers_license')




