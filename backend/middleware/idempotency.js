/**
 * Idempotency middleware for transaction creation and updates
 * 
 * Prevents duplicate submissions by tracking idempotency keys.
 * Each request should include a unique "Idempotency-Key" header.
 * 
 * If the same key is used again within 24 hours:
 * - Returns the cached response instead of processing again
 * - Prevents duplicate transactions
 * 
 * Uses database-backed storage for persistence across server restarts.
 * Falls back to in-memory cache for performance.
 */

import sql from '../config/database.js';

// In-memory cache for fast lookups (with database as source of truth)
// Structure: { userId_key: { response, timestamp } }
const idempotencyCache = new Map();

// Cleanup interval: remove keys older than 24 hours
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cleanup old entries from cache every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run cleanup every hour

// Cleanup database every 6 hours
setInterval(async () => {
  try {
    await sql`
      DELETE FROM idempotency_keys 
      WHERE expires_at < NOW()
    `;
  } catch (error) {
    console.error('[IDEMPOTENCY] Database cleanup error:', error);
  }
}, 6 * 60 * 60 * 1000); // Run cleanup every 6 hours

export const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  const userId = req.user?.userId;

  // If no idempotency key provided, reject the request
  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Idempotency-Key header is required for transaction operations"
    });
  }

  // Validate idempotency key format (should be UUID or similar)
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 10) {
    return res.status(400).json({
      error: "Invalid Idempotency-Key format"
    });
  }

  // Create composite key for cache: userId_idempotencyKey
  const cacheKey = `${userId}_${idempotencyKey}`;

  // First check in-memory cache for fast response
  const cachedEntry = idempotencyCache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < IDEMPOTENCY_TTL) {
    return res.status(cachedEntry.statusCode).json(cachedEntry.response);
  }

  // Check database for idempotency key
  try {
    const result = await sql`
      SELECT response_status, response_body 
      FROM idempotency_keys 
      WHERE user_id = ${userId} AND idempotency_key = ${idempotencyKey} AND expires_at > NOW()
    `;

    if (result.length > 0) {
      const dbEntry = result[0];
      
      // Update cache for faster future lookups
      idempotencyCache.set(cacheKey, {
        statusCode: dbEntry.response_status,
        response: dbEntry.response_body,
        timestamp: Date.now()
      });
      
      return res.status(dbEntry.response_status).json(dbEntry.response_body);
    }
  } catch (error) {
    console.error('[IDEMPOTENCY] Database check error:', error);
    // Continue processing - don't fail the request due to idempotency check failure
  }

  // Intercept response to cache it
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  let statusCode = 200;

  res.status = function(code) {
    statusCode = code;
    return originalStatus(code);
  };

  res.json = function(body) {
    // Only cache successful responses (2xx status codes)
    if (statusCode >= 200 && statusCode < 300) {
      // Cache in memory for fast access
      idempotencyCache.set(cacheKey, {
        statusCode,
        response: body,
        timestamp: Date.now()
      });
      
      // Store in database for persistence across restarts
      const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL);
      sql`
        INSERT INTO idempotency_keys (user_id, idempotency_key, response_status, response_body, expires_at)
        VALUES (${userId}, ${idempotencyKey}, ${statusCode}, ${JSON.stringify(body)}, ${expiresAt})
        ON CONFLICT (user_id, idempotency_key) 
        DO UPDATE SET 
          response_status = EXCLUDED.response_status,
          response_body = EXCLUDED.response_body,
          expires_at = EXCLUDED.expires_at
      `.catch((error) => {
        console.error('[IDEMPOTENCY] Database store error:', error);
        // Don't fail the request if database storage fails
      });
    }
    
    return originalJson(body);
  };

  // Store the idempotency key in request for logging/tracking
  req.idempotencyKey = idempotencyKey;

  next();
};

// Export function to get cache size (for monitoring/debugging)
export const getIdempotencyStoreSize = () => idempotencyCache.size;

// Export function to clear the cache (for testing)
export const clearIdempotencyStore = () => idempotencyCache.clear();
