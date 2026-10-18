import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

def get_or_set_cached_data(cache_key: str, data_fn, timeout: int = 120):
    """
    Retrieve cached object if present; otherwise execute data_fn(),
    cache the result for timeout seconds, and return it.
    """
    try:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
    except Exception as exc:
        logger.warning("Cache get error for key %s: %s", cache_key, exc)

    data = data_fn()

    try:
        cache.set(cache_key, data, timeout=timeout)
    except Exception as exc:
        logger.warning("Cache set error for key %s: %s", cache_key, exc)

    return data


def invalidate_cache_keys(*keys):
    """
    Delete specific keys from cache.
    """
    try:
        cache.delete_many(keys)
    except Exception as exc:
        logger.warning("Cache delete error for keys %s: %s", keys, exc)
