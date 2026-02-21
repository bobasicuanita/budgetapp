import { 
  fetchAndStoreTodayRates, 
  getMostRecentRatesDate, 
  copyExchangeRates 
} from '../services/exchangeRateService.js';

// Retry configuration
const RETRY_DELAYS = [
  30 * 60 * 1000,  // 30 minutes
  60 * 60 * 1000,  // 1 hour
  60 * 60 * 1000,  // 1 hour
  60 * 60 * 1000,  // 1 hour
  60 * 60 * 1000,  // 1 hour
  60 * 60 * 1000,  // 1 hour
];
const MAX_RETRIES = 6;

let retryCount = 0;
let retryTimeout = null;

/**
 * Attempts to fetch and store exchange rates with retry logic
 * Falls back to copying previous day's rates if all retries fail
 */
async function fetchWithRetry() {
  try {
    await fetchAndStoreTodayRates();
    // Success - reset retry count
    retryCount = 0;
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  } catch (error) {
    console.error(`[Exchange Rates Cron] ✗ Attempt ${retryCount + 1} failed:`, error.message);
    console.error(`[Exchange Rates Cron] Error details:`, error);
    
    // Check if we should retry
    if (retryCount < MAX_RETRIES) {
      const delayIndex = Math.min(retryCount, RETRY_DELAYS.length - 1);
      const delay = RETRY_DELAYS[delayIndex];
      const delayMinutes = delay / (60 * 1000);
      
      retryCount++;
      
      console.log(`[Exchange Rates Cron] Scheduling retry ${retryCount}/${MAX_RETRIES} in ${delayMinutes} minutes...`);
      
      retryTimeout = setTimeout(() => {
        fetchWithRetry();
      }, delay);
    } else {
      // All retries exhausted - use fallback
      console.error(`[Exchange Rates Cron] ✗ Max retries (${MAX_RETRIES}) reached.`);
      console.log(`[Exchange Rates Cron] Attempting fallback: using previous day's rates...`);
      
      try {
        // Get the most recent date we have rates for
        const mostRecent = await getMostRecentRatesDate();
        
        if (!mostRecent) {
          console.error(`[Exchange Rates Cron] ✗ CRITICAL: No historical exchange rates found in database!`);
          console.error(`[Exchange Rates Cron] ✗ Cannot provide fallback rates. Manual intervention required.`);
        } else {
          // Get today's date in UTC
          const now = new Date();
          const year = now.getUTCFullYear();
          const month = String(now.getUTCMonth() + 1).padStart(2, '0');
          const day = String(now.getUTCDate()).padStart(2, '0');
          const today = `${year}-${month}-${day}`;
          
          if (mostRecent.date === today) {
            console.log(`[Exchange Rates Cron] ℹ Rates for today already exist (${mostRecent.count} currencies). No fallback needed.`);
          } else {
            console.log(`[Exchange Rates Cron] Using rates from ${mostRecent.date} (${mostRecent.count} currencies)`);
            const copiedCount = await copyExchangeRates(mostRecent.date, today);
            console.log(`[Exchange Rates Cron] ✓ Fallback successful: ${copiedCount} rates copied from ${mostRecent.date}`);
            console.log(`[Exchange Rates Cron] ⚠ WARNING: Using outdated exchange rates. API fetch failed.`);
          }
        }
      } catch (fallbackError) {
        console.error(`[Exchange Rates Cron] ✗ Fallback also failed:`, fallbackError.message);
        console.error(`[Exchange Rates Cron] ✗ CRITICAL: Unable to provide exchange rates for today!`);
      }
      
      retryCount = 0; // Reset for next day
    }
  }
}

/**
 * Calculates milliseconds until next scheduled time (02:00 UTC)
 * Exchange rates are typically available early morning UTC
 */
function getMillisecondsUntilScheduledTime() {
  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setUTCHours(2, 0, 0, 0); // Set to 02:00 UTC today
  
  // If 02:00 UTC today has passed, schedule for 02:00 UTC tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setUTCDate(scheduledTime.getUTCDate() + 1);
  }
  
  return scheduledTime - now;
}

/**
 * Schedules the daily exchange rate fetch at 02:00 UTC
 * ALL exchange rates are stored with UTC dates
 */
export function scheduleExchangeRateFetch() {
  console.log('[Exchange Rates Cron] Scheduler started (UTC-based)');
  
  // Schedule first run at next 02:00 UTC
  const msUntilScheduledTime = getMillisecondsUntilScheduledTime();
  const hoursUntilScheduledTime = (msUntilScheduledTime / (1000 * 60 * 60)).toFixed(2);
  
  const nextRunTime = new Date(Date.now() + msUntilScheduledTime);
  const nextRunUTC = nextRunTime.toISOString().substring(0, 19).replace('T', ' ');
  
  console.log(`[Exchange Rates Cron] Next run scheduled in ${hoursUntilScheduledTime} hours (at 02:00 UTC)`);
  console.log(`[Exchange Rates Cron] Next run time: ${nextRunUTC} UTC`);
  
  setTimeout(() => {
    // Run the job
    console.log('[Exchange Rates Cron] Running scheduled fetch at 02:00 UTC...');
    fetchWithRetry();
    
    // Schedule recurring daily runs at 02:00 UTC (every 24 hours)
    setInterval(() => {
      console.log('[Exchange Rates Cron] Running scheduled fetch at 02:00 UTC...');
      fetchWithRetry();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilScheduledTime);
  
  // Optional: Run immediately on startup for testing
  // ⚠️ WARNING: Each fetch uses 1 API request from your 100/month quota
  // Uncomment ONLY when you need to test. Comment out after testing!
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('[Exchange Rates Cron] Running immediate fetch for testing...');
  //   fetchWithRetry();
  // }
}

/**
 * Stops the exchange rate cron job
 */
export function stopExchangeRateFetch() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  console.log('[Exchange Rates Cron] Scheduler stopped');
}
