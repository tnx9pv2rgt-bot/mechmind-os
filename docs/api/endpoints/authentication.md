# Authentication API

The MechMind OS API uses JWT (JSON Web Token) based authentication. All API requests (except login) must include a valid access token in the Authorization header.

## Overview

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/v1/auth/login` | POST | No | Authenticate and obtain tokens |
| `/v1/auth/refresh` | POST | No | Refresh access token |
| `/v1/auth/logout` | POST | Yes | Invalidate token |

## Login

Authenticate using email/password or API key to obtain access and refresh tokens.

### Password Authentication

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "admin@autoshop.com",
  "password": "securePassword123"
}
```

### API Key Authentication

```http
POST /v1/auth/login
Content-Type: application/json

{
  "api_key": "mk_live_abc123xyz789"
}
```

### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@autoshop.com",
    "first_name": "John",
    "last_name": "Smith",
    "role": "admin",
    "shop_id": "550e8400-e29b-41d4-a716-446655440001",
    "permissions": ["bookings:read", "bookings:write", "customers:read"]
  }
}
```

## Using Access Tokens

Include the access token in the Authorization header for all API requests:

```http
GET /v1/bookings
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

## Token Refresh

Access tokens expire after 1 hour. Use the refresh token to obtain a new access token:

```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 3600
}
```

## Logout

Invalidate the current access token:

```http
POST /v1/auth/logout
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid credentials |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `TOKEN_INVALID` | 401 | Token format or signature invalid |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token is invalid or revoked |
| `ACCOUNT_LOCKED` | 403 | Account temporarily locked |
| `ACCOUNT_SUSPENDED` | 403 | Account has been suspended |

## Code Examples

### cURL

```bash
# Login
curl -X POST https://api.mechmind.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@autoshop.com",
    "password": "securePassword123"
  }'

# Use token
curl https://api.mechmind.io/v1/bookings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Python

```python
import requests

# Login
response = requests.post(
    "https://api.mechmind.io/v1/auth/login",
    json={
        "email": "admin@autoshop.com",
        "password": "securePassword123"
    }
)
tokens = response.json()

# Use token
headers = {"Authorization": f"Bearer {tokens['access_token']}"}
bookings = requests.get(
    "https://api.mechmind.io/v1/bookings",
    headers=headers
).json()
```

### JavaScript

```javascript
// Login
const login = await fetch('https://api.mechmind.io/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@autoshop.com',
    password: 'securePassword123'
  })
});
const { access_token } = await login.json();

// Use token
const bookings = await fetch('https://api.mechmind.io/v1/bookings', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```

## Security Best Practices

1. **Store tokens securely** - Never store tokens in localStorage for production apps
2. **Use HTTPS only** - Tokens are transmitted in headers
3. **Implement token refresh** - Refresh before expiration to avoid interruptions
4. **Handle 401 errors** - Redirect to login when tokens are invalid
5. **Logout on exit** - Invalidate tokens when users log out
