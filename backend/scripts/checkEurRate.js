import sql from '../config/database.js';

async function checkEurRate() {
  try {
    // Get today's date in UTC
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const result = await sql`
      SELECT * 
      FROM exchange_rates 
      WHERE currency_code = 'EUR' 
      AND date = ${today}::date
    `;
    
    console.log(`EUR Rate for ${today} (UTC):`, result);
    
    if (result.length === 0) {
      console.log(`\nNo EUR rate found for ${today} (UTC). Checking all EUR rates...`);
      const allEur = await sql`
        SELECT * 
        FROM exchange_rates 
        WHERE currency_code = 'EUR'
        ORDER BY date DESC
        LIMIT 5
      `;
      console.log('All EUR rates:', allEur);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkEurRate();
