from slowapi import Limiter
from slowapi.util import get_ipaddr

limiter = Limiter(key_func=get_ipaddr)

AUTH_RATE_LIMIT = "5/minute"
REFRESH_RATE_LIMIT = "10/minute"
FILE_UPLOAD_RATE_LIMIT = "10/minute"
JOIN_PROJECT_RATE_LIMIT = "20/minute"
INVITE_RATE_LIMIT = "10/minute"
