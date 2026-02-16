/**
 * Idempotency middleware for transaction creation and updates
 * 
 * Prevents duplicate submissions by tracking idempotency keys.
 * Each request should include a unique "Idempotency-Key" header.
 * 
 * If the same key is used again within 24 hours:
 * - Returns the cached response instead of processing again
 * - Prevents duplicate transactions
 */

// In-memory store for idempotency keys
// Structure: { userId_key: { response, timestamp } }
const idempotencyStore = new Map();

// Cleanup interval: remove keys older than 24 hours
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run cleanup every hour

export const idempotencyMiddleware = (req, res, next) => {
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

  // Create composite key: userId_idempotencyKey
  const storeKey = `${userId}_${idempotencyKey}`;

  // Check if this key has been used before
  const cachedEntry = idempotencyStore.get(storeKey);
  
  if (cachedEntry) {
    // Check if entry is still valid (within TTL)
    if (Date.now() - cachedEntry.timestamp < IDEMPOTENCY_TTL) {
      // Return cached response
      return res.status(cachedEntry.statusCode).json(cachedEntry.response);
    } else {
      // Entry expired, remove it
      idempotencyStore.delete(storeKey);
    }
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
      idempotencyStore.set(storeKey, {
        statusCode,
        response: body,
        timestamp: Date.now()
      });
    }
    
    return originalJson(body);
  };

  // Store the idempotency key in request for logging/tracking
  req.idempotencyKey = idempotencyKey;

  next();
};

// Export function to get store size (for monitoring/debugging)
export const getIdempotencyStoreSize = () => idempotencyStore.size;

// Export function to clear the store (for testing)
export const clearIdempotencyStore = () => idempotencyStore.clear();
