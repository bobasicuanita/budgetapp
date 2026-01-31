# Rate Limiting Configuration

Rate limiting has been implemented to protect authentication endpoints from brute force attacks and abuse.

## Rate Limits by Endpoint

### Login - **STRICT** (`POST /api/auth/login`)
- **Limit:** 5 attempts per 15 minutes
- **Reason:** Prevent brute force password attacks
- **Error Message:** "Too many login attempts, please try again after 15 minutes."

### Registration (`POST /api/auth/register`)
- **Limit:** 3 accounts per hour per IP
- **Reason:** Prevent spam account creation
- **Error Message:** "Too many accounts created from this IP, please try again after an hour."

### Forgot Password (`POST /api/auth/forgot-password`)
- **Limit:** 3 requests per hour per IP
- **Reason:** Prevent email spam and abuse
- **Error Message:** "Too many password reset attempts, please try again after an hour."

### Reset Password (`POST /api/auth/reset-password`)
- **Limit:** 3 attempts per hour per IP
- **Reason:** Prevent token guessing attacks
- **Error Message:** "Too many password reset attempts, please try again after an hour."

### Resend Verification (`POST /api/auth/resend-verification`)
- **Limit:** 3 requests per 15 minutes per IP
- **Reason:** Prevent email spam
- **Error Message:** "Too many verification email requests, please try again later."

### Verify Email (`GET /api/auth/verify-email`)
- **Limit:** 100 requests per 15 minutes per IP
- **Reason:** General protection, more lenient as tokens are one-time use
- **Error Message:** "Too many requests from this IP, please try again later."

### Protected Routes (`/me`, `/logout`)
- **No specific rate limit** - Protected by authentication middleware
- Users must have valid JWT token to access

## How It Works

1. **IP-Based Tracking:** Limits are applied per IP address
2. **Sliding Window:** 15-minute or 1-hour windows depending on endpoint
3. **Headers:** Rate limit info returned in `RateLimit-*` headers:
   - `RateLimit-Limit`: Maximum requests allowed
   - `RateLimit-Remaining`: Requests remaining in current window
   - `RateLimit-Reset`: Time when the limit resets

## Testing Rate Limits

To test rate limiting:

```bash
# Try to login 6 times quickly (will be blocked on 6th attempt)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo "\nAttempt $i\n"
done
```

## Production Considerations

For production, consider:

1. **Redis Store:** Use Redis instead of in-memory store for distributed systems
   ```javascript
   import RedisStore from 'rate-limit-redis';
   import { createClient } from 'redis';
   
   const client = createClient({ url: process.env.REDIS_URL });
   
   export const loginLimiter = rateLimit({
     store: new RedisStore({ client }),
     // ... other options
   });
   ```

2. **Customize Limits:** Adjust limits based on your traffic patterns
3. **Whitelist IPs:** Whitelist trusted IPs if needed
4. **Logging:** Log rate limit violations for security monitoring

## Configuration File

Rate limiting configuration: `backend/middleware/rateLimiter.js`
