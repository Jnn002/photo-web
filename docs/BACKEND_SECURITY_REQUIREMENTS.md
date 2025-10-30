# Backend Security Requirements

This document outlines the security improvements required in the backend to fully support the frontend security refactoring.

## Overview

The frontend has been refactored with significant security improvements. To complete the security implementation, the backend must implement complementary features, particularly around token management and security headers.

## Priority: CRITICAL

### 1. HTTP-Only Cookies for Refresh Tokens

**Status**: Required for production
**Impact**: Eliminates XSS vulnerability for refresh tokens

#### Current State
- Refresh tokens are sent in response body
- Frontend stores them in sessionStorage
- Vulnerable to XSS attacks

#### Required Changes

**Backend Changes:**
```python
# On /auth/login and /auth/refresh endpoints
response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,  # Cannot be accessed by JavaScript
    secure=True,    # Only sent over HTTPS
    samesite="Strict",  # CSRF protection
    max_age=30 * 24 * 60 * 60,  # 30 days
    path="/api/v1/auth"  # Limit scope
)

# Response body should NOT include refresh_token
return {
    "access_token": access_token,
    "token_type": "bearer",
    "user": user_data
}
```

**Token Refresh Endpoint:**
```python
@router.post("/auth/refresh")
async def refresh_token(request: Request):
    # Read refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    # Validate and generate new tokens
    new_access_token = generate_access_token(...)
    new_refresh_token = generate_refresh_token(...)

    response = JSONResponse(content={
        "access_token": new_access_token,
        "token_type": "bearer"
    })

    # Set new refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=30 * 24 * 60 * 60,
        path="/api/v1/auth"
    )

    return response
```

**Logout Endpoint:**
```python
@router.post("/auth/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out successfully"})

    # Clear refresh token cookie
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth"
    )

    return response
```

---

## Priority: HIGH

### 2. CORS Configuration

**Status**: Required for httpOnly cookies
**Impact**: Allows cookies to be sent cross-origin

#### Required Changes

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Frontend URL
    allow_credentials=True,  # CRITICAL: Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)
```

**Important:**
- `allow_credentials=True` is REQUIRED for cookies to work
- `allow_origins` should be specific, never use `["*"]` with credentials
- Use environment variables for allowed origins

---

### 3. Security Response Headers

**Status**: Strongly recommended
**Impact**: Defense in depth against various attacks

#### Required Changes

```python
from fastapi import Response
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Strict Transport Security (HTTPS only)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

### 4. CSRF Protection

**Status**: Recommended for state-changing operations
**Impact**: Prevents CSRF attacks on POST/PUT/DELETE

#### Required Changes

While JWT in Authorization header provides some CSRF protection, implement additional layer:

```python
from fastapi import Header, HTTPException

async def verify_csrf_token(x_csrf_token: str = Header(None)):
    """
    Custom CSRF verification for critical operations
    Frontend must send a custom header that CSRF can't replicate
    """
    if not x_csrf_token:
        raise HTTPException(status_code=403, detail="CSRF token missing")

    # Verify token (implementation depends on your strategy)
    return x_csrf_token

# Use on sensitive endpoints
@router.post("/users/{user_id}/delete")
async def delete_user(user_id: int, csrf_token: str = Depends(verify_csrf_token)):
    # Delete user logic
    pass
```

---

### 5. Password Policy Enforcement

**Status**: Required to match frontend
**Impact**: Enforces strong passwords

#### Required Changes

Frontend now enforces:
- Minimum 10 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Backend must validate the same rules:**

```python
import re
from fastapi import HTTPException

def validate_password(password: str) -> None:
    """
    Validate password meets security requirements
    Must match frontend validation
    """
    if len(password) < 10:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 10 characters long"
        )

    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter"
        )

    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one lowercase letter"
        )

    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number"
        )

    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character"
        )

# Use in registration and password change endpoints
@router.post("/auth/register")
async def register(data: RegistrationData):
    validate_password(data.password)
    # Continue registration
```

---

### 6. Generic Error Messages

**Status**: Recommended
**Impact**: Prevents user enumeration

#### Required Changes

**Login endpoint:**
```python
@router.post("/auth/login")
async def login(credentials: UserLogin):
    user = get_user_by_email(credentials.email)

    if not user or not verify_password(credentials.password, user.hashed_password):
        # SECURITY: Generic message, don't reveal if email exists
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"  # Not "User not found" or "Wrong password"
        )

    # Continue login
```

**Registration endpoint:**
```python
@router.post("/auth/register")
async def register(data: RegistrationData):
    if email_exists(data.email):
        # SECURITY: Don't reveal if email is already registered
        raise HTTPException(
            status_code=400,
            detail="Registration failed. Please check your information."
        )

    # Continue registration
```

---

## Priority: MEDIUM

### 7. Rate Limiting

**Status**: Recommended
**Impact**: Prevents brute force attacks

#### Required Changes

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/auth/login")
@limiter.limit("5/minute")  # Max 5 attempts per minute
async def login(request: Request, credentials: UserLogin):
    # Login logic
    pass

@router.post("/auth/register")
@limiter.limit("3/hour")  # Max 3 registrations per hour per IP
async def register(request: Request, data: RegistrationData):
    # Registration logic
    pass
```

---

### 8. Token Expiration Configuration

**Status**: Recommended
**Impact**: Security-usability balance

#### Recommended Values

Frontend expects tokens to expire with sufficient warning time:

```python
# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 30    # 30 days

# Frontend shows warning 5 minutes before expiration
# Frontend auto-refreshes 10 minutes before expiration
# Make sure tokens last at least 15 minutes to allow time for warnings
```

---

### 9. Audit Logging

**Status**: Recommended
**Impact**: Security monitoring and forensics

#### Required Changes

Log security-relevant events:

```python
import logging

security_logger = logging.getLogger("security")

@router.post("/auth/login")
async def login(request: Request, credentials: UserLogin):
    try:
        # Login logic
        security_logger.info(f"Login successful for {credentials.email} from {get_remote_address(request)}")
    except Exception as e:
        security_logger.warning(f"Login failed for {credentials.email} from {get_remote_address(request)}: {str(e)}")
        raise

# Log these events:
# - Login success/failure
# - Token refresh
# - Logout
# - Password changes
# - Permission changes
# - Failed authorization attempts
```

---

## Priority: LOW

### 10. Session Extension Endpoint

**Status**: Optional
**Impact**: Better UX for session timeout warnings

Frontend can request session extension when user clicks "Keep me logged in":

```python
@router.post("/auth/extend-session")
async def extend_session(request: Request, current_user: User = Depends(get_current_user)):
    """
    Extend user session by issuing new tokens
    Called when user responds to session timeout warning
    """
    new_access_token = generate_access_token(current_user)
    new_refresh_token = generate_refresh_token(current_user)

    response = JSONResponse(content={
        "access_token": new_access_token,
        "token_type": "bearer"
    })

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=30 * 24 * 60 * 60,
        path="/api/v1/auth"
    )

    security_logger.info(f"Session extended for user {current_user.email}")

    return response
```

---

## Implementation Checklist

### Phase 1: Critical (Required for production)
- [ ] Implement httpOnly cookies for refresh tokens
- [ ] Update CORS configuration for credentials
- [ ] Remove refresh_token from response bodies
- [ ] Update /auth/refresh to read from cookies
- [ ] Update /auth/logout to clear cookies

### Phase 2: High Priority
- [ ] Add security response headers middleware
- [ ] Implement password strength validation
- [ ] Sanitize error messages (generic responses)
- [ ] Review and update CORS allowed origins

### Phase 3: Medium Priority
- [ ] Implement rate limiting on auth endpoints
- [ ] Configure appropriate token expiration times
- [ ] Implement security audit logging
- [ ] Add CSRF protection for sensitive operations

### Phase 4: Low Priority
- [ ] Add session extension endpoint
- [ ] Implement account lockout after failed attempts
- [ ] Add password breach checking (haveibeenpwned API)
- [ ] Implement 2FA (optional)

---

## Testing Recommendations

### 1. Test HTTP-Only Cookies
```bash
# Login should set cookie
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  -c cookies.txt -v

# Check that refresh_token is NOT in response body
# Check that Set-Cookie header includes: HttpOnly; Secure; SameSite=Strict

# Refresh should work with cookie
curl -X POST https://api.yourdomain.com/api/v1/auth/refresh \
  -b cookies.txt -v
```

### 2. Test CORS
```bash
# Frontend origin should be allowed
curl -X OPTIONS https://api.yourdomain.com/api/v1/auth/login \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Check for Access-Control-Allow-Credentials: true
```

### 3. Test Password Validation
```bash
# Weak password should fail
curl -X POST https://api.yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"weak"}' \
  -v

# Should return 400 with password requirements error
```

### 4. Test Rate Limiting
```bash
# Multiple failed logins should trigger rate limit
for i in {1..10}; do
  curl -X POST https://api.yourdomain.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -v
done

# Should return 429 Too Many Requests after limit
```

---

## Migration Plan

### Development Environment
1. Implement changes in development backend
2. Test with development frontend
3. Verify cookies work in development
4. Test all auth flows

### Staging Environment
1. Deploy backend changes to staging
2. Configure HTTPS (required for secure cookies)
3. Update CORS to allow staging frontend origin
4. Run integration tests
5. Verify security headers

### Production Deployment
1. **BEFORE frontend deployment:**
   - Deploy backend with backwards compatibility
   - Support both cookie AND body refresh tokens temporarily
   - Monitor logs for any issues

2. **Deploy frontend:**
   - Frontend will use new security features
   - Old sessions will migrate naturally on next refresh

3. **AFTER stabilization (1-2 weeks):**
   - Remove backwards compatibility from backend
   - Refresh token only in cookies
   - Monitor for any breaking changes

---

## Security Checklist for Production

- [ ] HTTPS enabled on all environments
- [ ] httpOnly cookies implemented
- [ ] CORS configured with specific origins
- [ ] Security headers middleware active
- [ ] Password validation enforced
- [ ] Error messages sanitized
- [ ] Rate limiting active
- [ ] Audit logging enabled
- [ ] Token expiration configured properly
- [ ] Security monitoring/alerting set up

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Support

For questions or clarifications about these requirements, contact the frontend security team or create an issue in the project repository.

**Last Updated:** January 2025
**Document Version:** 1.0
