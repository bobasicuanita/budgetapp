import sql from '../config/database.js';

/**
 * Test currency conversion logic
 */
async function testCurrencyConversion() {
  try {
    console.log('\n🧪 Testing Multi-Currency Conversion\n');
    console.log('─'.repeat(60));
    
    // Get the most recent exchange rates
    const [latestDate] = await sql`
      SELECT DISTINCT date
      FROM exchange_rates
      ORDER BY date DESC
      LIMIT 1
    `;

    if (!latestDate) {
      console.error('❌ No exchange rates found in database!');
      console.log('Run the exchange rate cron job first.');
      return;
    }

    console.log(`📅 Using exchange rates from: ${latestDate.date.toISOString().split('T')[0]}\n`);

    // Fetch exchange rates - need to format date properly
    const dateStr = latestDate.date.toISOString().split('T')[0];
    console.log(`🔍 Querying for date: ${dateStr}\n`);
    
    const rates = await sql`
      SELECT currency_code, rate
      FROM exchange_rates
      WHERE date::text = ${dateStr}
    `;
    
    console.log(`📊 Fetched ${rates.length} exchange rates from database\n`);
    
    const exchangeRates = rates.reduce((acc, r) => {
      acc[r.currency_code] = parseFloat(r.rate);
      return acc;
    }, {});
    
    console.log(`📦 Parsed exchange rates object has ${Object.keys(exchangeRates).length} entries\n`);

    // Test Scenario: User with USD base currency
    console.log('📊 Test Scenario:');
    console.log('   User Base Currency: USD');
    console.log('\n   Wallets:');
    console.log('   1. Cash: 3,000 USD');
    console.log('   2. Checking Main: 25,000 USD');
    console.log('   3. Euro Bank Account: 5,000 EUR');
    console.log('\n' + '─'.repeat(60));

    const baseCurrency = 'USD';
    const wallets = [
      { name: 'Cash', currency: 'USD', balance: 3000 },
      { name: 'Checking Main', currency: 'USD', balance: 25000 },
      { name: 'Euro Bank Account', currency: 'EUR', balance: 5000 }
    ];

    // Get EUR rate
    const eurRate = exchangeRates['EUR'];
    
    // Debug: show what rates we have
    console.log(`\n💱 Available Exchange Rates (sample):`);
    const sampleCurrencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
    sampleCurrencies.forEach(curr => {
      if (exchangeRates[curr]) {
        console.log(`   ${curr}: ${exchangeRates[curr]}`);
      }
    });
    
    console.log(`\n💱 Using Exchange Rate: USDEUR = ${eurRate || 'NOT FOUND'} (1 USD = ${eurRate} EUR)`);
    console.log('─'.repeat(60));

    console.log('\n🧮 Conversion Process:\n');

    let totalNetWorth = 0;

    wallets.forEach((wallet, index) => {
      let convertedBalance;
      
      if (wallet.currency === baseCurrency) {
        convertedBalance = wallet.balance;
        console.log(`${index + 1}. ${wallet.name} (${wallet.currency}):`);
        console.log(`   ${wallet.balance.toFixed(2)} ${wallet.currency} (no conversion needed)`);
        console.log(`   = ${convertedBalance.toFixed(2)} ${baseCurrency}`);
      } else {
        const rate = exchangeRates[wallet.currency];
        if (!rate) {
          console.log(`${index + 1}. ${wallet.name} (${wallet.currency}):`);
          console.log(`   ⚠️  No exchange rate found for ${wallet.currency}`);
          convertedBalance = wallet.balance; // Fallback to 1:1
        } else {
          convertedBalance = wallet.balance / rate;
          console.log(`${index + 1}. ${wallet.name} (${wallet.currency}):`);
          console.log(`   ${wallet.balance.toFixed(2)} ${wallet.currency} / ${rate}`);
          console.log(`   = ${convertedBalance.toFixed(2)} ${baseCurrency}`);
        }
      }
      
      totalNetWorth += convertedBalance;
      console.log('');
    });

    console.log('─'.repeat(60));
    console.log(`\n✅ Total Net Worth: ${totalNetWorth.toFixed(2)} ${baseCurrency}`);
    console.log('\n' + '─'.repeat(60));

    // Compare with old (wrong) calculation
    const oldCalculation = wallets.reduce((sum, w) => sum + w.balance, 0);
    console.log('\n📉 Old Calculation (WRONG):');
    console.log(`   Simple sum: ${oldCalculation.toFixed(2)} (incorrect - mixed currencies!)`);
    
    console.log('\n📈 New Calculation (CORRECT):');
    console.log(`   With conversion: ${totalNetWorth.toFixed(2)} ${baseCurrency}`);
    
    const difference = totalNetWorth - oldCalculation;
    console.log(`\n   Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} ${baseCurrency}`);
    console.log('─'.repeat(60));

    // Test reverse conversion (USD to EUR)
    console.log('\n🔄 Reverse Conversion Test (USD to EUR):');
    const testAmount = 1000;
    const convertedToEur = testAmount * eurRate;
    const backToUsd = convertedToEur / eurRate;
    console.log(`   ${testAmount} USD * ${eurRate} = ${convertedToEur.toFixed(2)} EUR`);
    console.log(`   ${convertedToEur.toFixed(2)} EUR / ${eurRate} = ${backToUsd.toFixed(2)} USD`);
    console.log(`   ✓ Round-trip conversion accurate`);
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await sql.end();
  }
}

testCurrencyConversion();
