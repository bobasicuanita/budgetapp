import sql from '../config/database.js';

/**
 * Script to recalculate all wallet balances based on transactions
 */

async function recalculateWalletBalances() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           WALLET BALANCE RECALCULATION                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Get all wallets
  const wallets = await sql`
    SELECT id, name, starting_balance, current_balance
    FROM wallets
    WHERE is_archived = false
  `;
  
  console.log(`Found ${wallets.length} active wallets\n`);
  
  let updatedCount = 0;
  let correctCount = 0;
  
  for (const wallet of wallets) {
    // Calculate balance from transactions (excluding initial_balance system transactions)
    // Use same CASE logic as balance history for consistency
    const result = await sql`
      SELECT COALESCE(
        SUM(
          CASE 
            WHEN to_wallet_id = ${wallet.id} THEN amount
            WHEN wallet_id = ${wallet.id} THEN amount
          END
        ), 0) as total
      FROM transactions
      WHERE (wallet_id = ${wallet.id} OR to_wallet_id = ${wallet.id})
        AND system_type IS DISTINCT FROM 'initial_balance'
    `;
    
    const { total } = result[0];
    
    // Calculate correct balance: starting_balance + all transactions
    let correctBalance = parseFloat(wallet.starting_balance) + parseFloat(total);
    
    // Handle numeric overflow - cap at database limits (DECIMAL(15,2))
    const MAX_VALUE = 9999999999999.99;
    const MIN_VALUE = -9999999999999.99;
    if (correctBalance > MAX_VALUE) {
      console.log(`⚠️  WARNING: Balance overflow for wallet ${wallet.name}, capping at max value`);
      correctBalance = MAX_VALUE;
    } else if (correctBalance < MIN_VALUE) {
      console.log(`⚠️  WARNING: Balance underflow for wallet ${wallet.name}, capping at min value`);
      correctBalance = MIN_VALUE;
    }
    
    const difference = correctBalance - parseFloat(wallet.current_balance);
    
    if (Math.abs(difference) > 0.01) {
      console.log(`Wallet: ${wallet.name} (ID: ${wallet.id})`);
      console.log(`  Starting: $${wallet.starting_balance}`);
      console.log(`  Transactions sum: $${total}`);
      console.log(`  Old Balance: $${wallet.current_balance}`);
      console.log(`  Calculated Balance: $${correctBalance.toFixed(2)}`);
      
      // Update wallet balance
      await sql`
        UPDATE wallets
        SET current_balance = ${correctBalance.toFixed(2)}
        WHERE id = ${wallet.id}
      `;
      
      console.log(`  ✓ Updated (difference: ${difference > 0 ? '+' : ''}$${difference.toFixed(2)})\n`);
      updatedCount++;
    } else {
      correctCount++;
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              RECALCULATION COMPLETED                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total wallets: ${wallets.length}`);
  console.log(`Balances updated: ${updatedCount}`);
  console.log(`Balances already correct: ${correctCount}\n`);
}

async function main() {
  try {
    await recalculateWalletBalances();
  } catch (error) {
    console.error('\n❌ Error during recalculation:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
