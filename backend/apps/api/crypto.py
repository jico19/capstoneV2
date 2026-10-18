import base64
import hashlib
import hmac
import json
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding


def _get_encryption_keys():
    """
    Returns (fernet_instance, aes_key, hmac_key) derived from settings.FIELD_ENCRYPTION_KEY
    or fallback derived from settings.SECRET_KEY.
    """
    raw_key = getattr(settings, "FIELD_ENCRYPTION_KEY", None)
    if not raw_key:
        secret = getattr(settings, "SECRET_KEY", "fallback-secret-key-32bytes-min!!")
        derived = hashlib.sha256(secret.encode("utf-8")).digest()
        raw_key = base64.urlsafe_b64encode(derived).decode("utf-8")

    try:
        raw_bytes = base64.urlsafe_b64decode(raw_key.encode("utf-8"))
        if len(raw_bytes) != 32:
            raise ValueError("Key must be 32 bytes")
    except Exception as e:
        raise ImproperlyConfigured(f"Invalid FIELD_ENCRYPTION_KEY: {e}")

    fernet = Fernet(raw_key.encode("utf-8"))
    aes_key = raw_bytes[:16]
    hmac_key = raw_bytes[16:]
    return fernet, aes_key, hmac_key


def encrypt_value(value: str, deterministic: bool = False) -> str:
    """
    Encrypts a string value. If deterministic=True, uses HMAC-derived IV
    so that identical inputs yield identical ciphertexts, enabling exact lookups and UNIQUE constraints.
    """
    if value is None or value == "":
        return value

    fernet, aes_key, hmac_key = _get_encryption_keys()
    val_bytes = str(value).encode("utf-8")

    if deterministic:
        # Synthetic IV from HMAC of plaintext
        iv = hmac.new(hmac_key, val_bytes, hashlib.sha256).digest()[:16]
        padder = padding.PKCS7(128).padder()
        padded = padder.update(val_bytes) + padder.finalize()
        cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
        encryptor = cipher.encryptor()
        ct = encryptor.update(padded) + encryptor.finalize()
        payload = base64.urlsafe_b64encode(iv + ct).decode("utf-8")
        return f"det${payload}"
    else:
        return fernet.encrypt(val_bytes).decode("utf-8")


def decrypt_value(value: str) -> str:
    """
    Decrypts a ciphertext string. If value is not encrypted or decryption fails, returns original value.
    """
    if not value or not isinstance(value, str):
        return value

    fernet, aes_key, hmac_key = _get_encryption_keys()

    if value.startswith("det$"):
        try:
            raw = base64.urlsafe_b64decode(value[4:].encode("utf-8"))
            iv = raw[:16]
            ct = raw[16:]
            cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
            decryptor = cipher.decryptor()
            padded = decryptor.update(ct) + decryptor.finalize()
            unpadder = padding.PKCS7(128).unpadder()
            val_bytes = unpadder.update(padded) + unpadder.finalize()
            return val_bytes.decode("utf-8")
        except Exception:
            return value

    if value.startswith("gAAAAA"):
        try:
            return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
        except (InvalidToken, Exception):
            return value

    return value


class EncryptedCharField(models.CharField):
    """
    A CharField that automatically encrypts data before storing in DB
    and decrypts when read. Supports deterministic=True for unique & filter lookups.
    """

    def __init__(self, *args, deterministic: bool = False, **kwargs):
        self.deterministic = deterministic
        # Allocate enough column size for ciphertext base64 overhead
        max_len = kwargs.get("max_length", 255)
        if max_len and max_len < 255:
            kwargs["max_length"] = 255
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self.deterministic:
            kwargs["deterministic"] = True
        return name, path, args, kwargs

    def get_prep_value(self, value):
        val = super().get_prep_value(value)
        if val is None or val == "":
            return val
        return encrypt_value(str(val), deterministic=self.deterministic)

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        return decrypt_value(value)

    def to_python(self, value):
        if isinstance(value, str):
            return decrypt_value(value)
        return value


class EncryptedTextField(models.TextField):
    """
    A TextField that automatically encrypts large text blocks.
    """

    def __init__(self, *args, deterministic: bool = False, **kwargs):
        self.deterministic = deterministic
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self.deterministic:
            kwargs["deterministic"] = True
        return name, path, args, kwargs

    def get_prep_value(self, value):
        val = super().get_prep_value(value)
        if val is None or val == "":
            return val
        return encrypt_value(str(val), deterministic=self.deterministic)

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        return decrypt_value(value)

    def to_python(self, value):
        if isinstance(value, str):
            return decrypt_value(value)
        return value


class EncryptedJSONField(models.TextField):
    """
    Stores dictionaries or lists encrypted as JSON in the database,
    deserializing them back to python dicts/lists on read.
    """

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return {}
        decrypted = decrypt_value(value)
        try:
            return json.loads(decrypted)
        except Exception:
            return {}

    def to_python(self, value):
        if value is None:
            return {}
        if isinstance(value, (dict, list)):
            return value
        decrypted = decrypt_value(value)
        try:
            return json.loads(decrypted)
        except Exception:
            return {}

    def get_prep_value(self, value):
        if value is None:
            return None
        json_str = json.dumps(value)
        return encrypt_value(json_str, deterministic=False)
