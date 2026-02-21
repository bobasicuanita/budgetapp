import sql from '../config/database.js';

async function checkExchangeRates() {
  try {
    // Get today's date in UTC
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    // Get count of stored rates for today (UTC)
    const [count] = await sql`
      SELECT COUNT(*) as count
      FROM exchange_rates
      WHERE date = ${today}::date
    `;
    
    console.log(`\n📊 Exchange Rates for Today (${today} UTC)`);
    console.log(`Total currencies stored: ${count.count}\n`);
    
    // Get sample rates
    const sampleRates = await sql`
      SELECT currency_code, rate, date
      FROM exchange_rates
      WHERE date = ${today}::date
      ORDER BY currency_code
      LIMIT 10
    `;
    
    console.log('Sample rates (first 10):');
    console.log('─'.repeat(50));
    sampleRates.forEach(r => {
      console.log(`${r.currency_code.padEnd(5)} | ${r.rate.toString().padEnd(12)} | ${r.date.toISOString().split('T')[0]}`);
    });
    console.log('─'.repeat(50));
    
    // Get all dates with rates
    const dates = await sql`
      SELECT DISTINCT date, COUNT(*) as count
      FROM exchange_rates
      GROUP BY date
      ORDER BY date DESC
      LIMIT 5
    `;
    
    console.log('\n📅 Recent dates with stored rates:');
    dates.forEach(d => {
      console.log(`  ${d.date.toISOString().split('T')[0]}: ${d.count} currencies`);
    });
    
  } catch (error) {
    console.error('Error checking exchange rates:', error);
  } finally {
    await sql.end();
  }
}

checkExchangeRates();
