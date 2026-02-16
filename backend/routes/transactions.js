import express from "express";
import sql from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { transactionShortTermLimiter, transactionLongTermLimiter } from "../middleware/rateLimiter.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";

const router = express.Router();

/**
 * GET /api/transactions
 * Get transactions with filters and pagination
 * 
 * IMPORTANT: Transaction dates are stored as DATE type (not TIMESTAMP).
 * Users think in days ("Feb 12"), not times/timezones. This simplifies:
 * - Future date filtering (date > CURRENT_DATE)
 * - Date comparisons (no timezone conversion needed)
 * - User experience (consistent dates across all timezones)
 * 
 * Query params:
 * - start_date (required): Start of date range (defaults to first day of current month)
 * - end_date (required): End of date range (defaults to last day of current month)
 * - type (optional): Transaction type filter - single or comma-separated (income, expense, transfer)
 * - wallet_ids (optional): Comma-separated wallet IDs (matches source or destination - OR logic)
 * - wallet_id (optional): Single wallet ID (legacy, use wallet_ids instead)
 * - page (optional): Page number (default: 1)
 * - per_page (optional): Items per page (default: 30, max: 100)
 * - category_ids (optional): Comma-separated category IDs (matches ANY - OR logic)
 * - category_id (optional): Single category ID (legacy, use category_ids instead)
 * - tag_ids (optional): Comma-separated tag IDs (matches ALL - AND logic)
 * - search (optional): Search in description or merchant (case-insensitive)
 * - min_amount (optional): Minimum amount (absolute value)
 * - max_amount (optional): Maximum amount (absolute value)
 * - include_future (optional): Include future dated transactions (default: false)
 * 
 * NOTE: For transfers, only one transaction per pair is returned (the "from" side with negative amount)
 */
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  const {
    start_date,
    end_date,
    type,
    wallet_id,
    wallet_ids,
    page = 1,
    per_page = 30,
    category_id,
    category_ids,
    tag_ids,
    search,
    min_amount,
    max_amount,
    include_future = 'false'
  } = req.query;

  try {
    // Default date range to current month if not provided
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    const defaultStartDate = start_date || firstDay.toISOString().split('T')[0];
    
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0);
    const defaultEndDate = end_date || lastDay.toISOString().split('T')[0];

    // Parse pagination
    const pageNum = parseInt(page) || 1;
    const perPage = Math.min(parseInt(per_page) || 30, 100); // Max 100 per page
    const offset = (pageNum - 1) * perPage;

    // Parse include_future
    const includeFuture = include_future === 'true';
    
    // Build WHERE conditions using sql.unsafe for the final query
    let queryParts = {
      baseWhere: `t.user_id = ${userId} 
        AND t.date >= '${defaultStartDate}'::date 
        AND t.date <= '${defaultEndDate}'::date`,
      additional: []
    };

    if (!includeFuture) {
      queryParts.additional.push(`t.date <= CURRENT_DATE`);
    }

    // Handle single or multiple transaction types (comma-separated)
    if (type) {
      const types = type.split(',').map(t => t.trim()).filter(t => ['income', 'expense', 'transfer'].includes(t));
      if (types.length === 1) {
        queryParts.additional.push(`t.type = '${types[0]}'`);
      } else if (types.length > 1) {
        const typeList = types.map(t => `'${t}'`).join(',');
        queryParts.additional.push(`t.type IN (${typeList})`);
      }
    }

    // Handle wallet filter (single or multiple)
    const walletFilter = wallet_ids || wallet_id;
    if (walletFilter) {
      const walletIdNums = walletFilter.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (walletIdNums.length === 1) {
        queryParts.additional.push(`(t.wallet_id = ${walletIdNums[0]} OR t.to_wallet_id = ${walletIdNums[0]})`);
      } else if (walletIdNums.length > 1) {
        const walletList = walletIdNums.join(',');
        queryParts.additional.push(`(t.wallet_id IN (${walletList}) OR t.to_wallet_id IN (${walletList}))`);
      }
    }

    // Handle category filter (single or multiple)
    const categoryFilter = category_ids || category_id;
    if (categoryFilter) {
      const categoryArray = categoryFilter.split(',').map(id => `'${id.trim()}'`).join(',');
      queryParts.additional.push(`t.category_id IN (${categoryArray})`);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, "''");
      queryParts.additional.push(`(
        LOWER(t.description) LIKE LOWER('%${searchTerm}%') OR 
        LOWER(t.merchant) LIKE LOWER('%${searchTerm}%')
      )`);
    }

    if (min_amount) {
      const minAmt = parseFloat(min_amount);
      queryParts.additional.push(`ABS(t.amount) >= ${minAmt}`);
    }

    if (max_amount) {
      const maxAmt = parseFloat(max_amount);
      queryParts.additional.push(`ABS(t.amount) <= ${maxAmt}`);
    }

    if (tag_ids && tag_ids.trim()) {
      const tagIdArray = tag_ids.split(',').map(id => `'${id.trim()}'`).join(',');
      const tagCount = tag_ids.split(',').length;
      queryParts.additional.push(`(
        SELECT COUNT(DISTINCT tt.tag_id)
        FROM transaction_tags tt
        WHERE tt.transaction_id = t.id
        AND tt.tag_id IN (${tagIdArray})
      ) = ${tagCount}`);
    }

    // For transfers, only show one transaction per pair (the "from" side with negative amount)
    queryParts.additional.push(`(t.type != 'transfer' OR t.amount < 0)`);
    
    const fullWhereClause = queryParts.additional.length > 0
      ? `${queryParts.baseWhere} AND ${queryParts.additional.join(' AND ')}`
      : queryParts.baseWhere;

    // Get transactions with filters
    const transactions = await sql.unsafe(`
      SELECT 
        t.*,
        w.name as wallet_name,
        w.icon as wallet_icon,
        w.type as wallet_type,
        c.name as category_name,
        c.icon as category_icon,
        c.type as category_type,
        tw.name as to_wallet_name,
        tw.icon as to_wallet_icon
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${fullWhereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `);

    // Get total count
    const [countResult] = await sql.unsafe(`
      SELECT COUNT(*)::int as total
      FROM transactions t
      WHERE ${fullWhereClause}
    `);

    const totalCount = countResult?.total || 0;
    const totalPages = Math.ceil(totalCount / perPage);

    // Get tags for each transaction
    const transactionIds = transactions.map(t => t.id);
    let transactionTags = [];
    
    if (transactionIds.length > 0) {
      transactionTags = await sql`
        SELECT tt.transaction_id, t.id as tag_id, t.name as tag_name, t.is_system
        FROM transaction_tags tt
        JOIN tags t ON tt.tag_id = t.id
        WHERE tt.transaction_id IN ${sql(transactionIds)}
      `;
    }

    // Attach tags to transactions
    const transactionsWithTags = transactions.map(transaction => ({
      ...transaction,
      tags: transactionTags
        .filter(tt => tt.transaction_id === transaction.id)
        .map(tt => ({
          id: tt.tag_id,
          name: tt.tag_name,
          is_system: tt.is_system
        }))
    }));

    res.json({
      transactions: transactionsWithTags,
      pagination: {
        page: pageNum,
        per_page: perPage,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      },
      filters: {
        start_date: defaultStartDate,
        end_date: defaultEndDate,
        type: type || 'all',
        wallet_id: wallet_id || 'all',
        category_id: category_id || 'all',
        tag_ids: tag_ids || 'none',
        search: search || '',
        min_amount: min_amount || null,
        max_amount: max_amount || null,
        include_future: includeFuture
      }
    });

  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ 
      error: "Failed to fetch transactions" 
    });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction (income, expense, or transfer)
 * 
 * Rate limits:
 * - 5 requests per 10 seconds
 * - 20 requests per hour
 * 
 * Requires Idempotency-Key header
 */
router.post("/", 
  authenticateToken, 
  transactionShortTermLimiter, 
  transactionLongTermLimiter, 
  idempotencyMiddleware, 
  async (req, res) => {
  const {
    transactionType,
    amount,
    walletId,
    fromWalletId,
    toWalletId,
    category,
    suggestedTags = [],
    customTags = [],
    date,
    merchant,
    counterparty,
    description
  } = req.body;

  const userId = req.user.userId;

  try {
    // Validate transaction type
    const validTypes = ['income', 'expense', 'transfer'];
    if (!transactionType || !validTypes.includes(transactionType)) {
      return res.status(400).json({ 
        error: "Valid transaction type is required (income, expense, or transfer)" 
      });
    }

    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        error: "Valid positive amount is required" 
      });
    }

    const amountValue = parseFloat(amount);

    // Validate date
    if (!date) {
      return res.status(400).json({ 
        error: "Date is required" 
      });
    }

    // Validate merchant length
    if (merchant && merchant.length > 80) {
      return res.status(400).json({ 
        error: "Merchant must not exceed 80 characters" 
      });
    }

    // Validate counterparty length
    if (counterparty && counterparty.length > 80) {
      return res.status(400).json({ 
        error: "Counterparty must not exceed 80 characters" 
      });
    }

    // Validate description length
    if (description && description.length > 200) {
      return res.status(400).json({ 
        error: "Description must not exceed 200 characters" 
      });
    }

    // Validate based on transaction type
    if (transactionType === 'transfer') {
      // Transfer validation
      if (!fromWalletId || !toWalletId) {
        return res.status(400).json({ 
          error: "Both from_wallet and to_wallet are required for transfers" 
        });
      }

      if (fromWalletId === toWalletId) {
        return res.status(400).json({ 
          error: "Cannot transfer to the same wallet" 
        });
      }

      if (category) {
        return res.status(400).json({ 
          error: "Transfers cannot have a category" 
        });
      }

      if (suggestedTags.length > 0 || customTags.length > 0) {
        return res.status(400).json({ 
          error: "Transfers cannot have tags" 
        });
      }
    } else {
      // Income/Expense validation
      if (!walletId) {
        return res.status(400).json({ 
          error: "Wallet is required for income and expense transactions" 
        });
      }

      if (!category) {
        return res.status(400).json({ 
          error: "Category is required for income and expense transactions" 
        });
      }

      // Validate tag limit (max 5)
      const totalTags = suggestedTags.length + customTags.length;
      if (totalTags > 5) {
        return res.status(400).json({ 
          error: "Cannot add more than 5 tags" 
        });
      }
    }

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Handle new tag creation
      const processedCustomTags = [];
      
      for (const tag of customTags) {
        if (tag.isNew) {
          // Create new user tag
          const [newTag] = await sql`
            INSERT INTO tags (user_id, name, is_system)
            VALUES (${userId}, ${tag.name}, false)
            RETURNING id, name
          `;
          processedCustomTags.push(newTag.id);
        } else {
          // Use existing tag ID
          processedCustomTags.push(tag.id);
        }
      }

      // Combine all tag IDs
      const allTagIds = [...suggestedTags, ...processedCustomTags];

      if (transactionType === 'transfer') {
        // Handle transfer: create 2 transactions
        
        // Verify both wallets belong to user
        const wallets = await sql`
          SELECT id, current_balance, type, currency 
          FROM wallets 
          WHERE id IN (${fromWalletId}, ${toWalletId}) 
          AND user_id = ${userId}
        `;

        if (wallets.length !== 2) {
          throw new Error("One or both wallets not found");
        }

        const fromWallet = wallets.find(w => w.id === parseInt(fromWalletId));
        const toWallet = wallets.find(w => w.id === parseInt(toWalletId));

        // Check if from_wallet would be overdrawn (only for cash wallets)
        if (fromWallet.type === 'cash' && fromWallet.current_balance < amountValue) {
          return res.status(400).json({ 
            error: "Insufficient balance in source wallet. Cash wallets cannot be overdrawn." 
          });
        }

        // Create "from" transaction (negative)
        const [fromTransaction] = await sql`
          INSERT INTO transactions (
            user_id, wallet_id, to_wallet_id, type, amount, 
            currency, description, date, is_system
          )
          VALUES (
            ${userId}, ${fromWalletId}, ${toWalletId}, 'transfer', ${-amountValue},
            ${fromWallet.currency}, ${description || null}, ${date}, false
          )
          RETURNING *
        `;

        // Create "to" transaction (positive)
        const [toTransaction] = await sql`
          INSERT INTO transactions (
            user_id, wallet_id, to_wallet_id, type, amount, 
            currency, description, date, is_system
          )
          VALUES (
            ${userId}, ${toWalletId}, ${fromWalletId}, 'transfer', ${amountValue},
            ${toWallet.currency}, ${description || null}, ${date}, false
          )
          RETURNING *
        `;

        // Update wallet balances
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${amountValue}
          WHERE id = ${fromWalletId}
        `;

        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${amountValue}
          WHERE id = ${toWalletId}
        `;

        return { 
          success: true, 
          transactions: [fromTransaction, toTransaction],
          type: 'transfer'
        };

      } else {
        // Handle income/expense
        
        // Verify wallet belongs to user
        const [wallet] = await sql`
          SELECT id, current_balance, type, currency 
          FROM wallets 
          WHERE id = ${walletId} AND user_id = ${userId}
        `;

        if (!wallet) {
          throw new Error("Wallet not found");
        }

        // Verify category belongs to user or is system, and matches transaction type
        const [categoryData] = await sql`
          SELECT id, type 
          FROM categories 
          WHERE id = ${category} 
          AND (user_id = ${userId} OR user_id IS NULL)
        `;

        if (!categoryData) {
          throw new Error("Category not found");
        }

        if (categoryData.type !== transactionType) {
          throw new Error(`Category type must match transaction type (${transactionType})`);
        }

        // For expenses, check if wallet can be overdrawn (only cash wallets)
        if (transactionType === 'expense') {
          if (wallet.type === 'cash' && wallet.current_balance < amountValue) {
            return res.status(400).json({ 
              error: "Insufficient balance. Cash wallets cannot be overdrawn." 
            });
          }
        }

        // Calculate actual amount (negative for expense)
        const actualAmount = transactionType === 'expense' ? -amountValue : amountValue;

        // Create transaction
        const [transaction] = await sql`
          INSERT INTO transactions (
            user_id, wallet_id, type, amount, currency, 
            merchant, counterparty, description, category_id, date, is_system
          )
          VALUES (
            ${userId}, ${walletId}, ${transactionType}, ${actualAmount}, 
            ${wallet.currency}, ${merchant || null}, ${counterparty || null}, ${description || null}, ${category}, ${date}, false
          )
          RETURNING *
        `;

        // Insert transaction tags
        if (allTagIds.length > 0) {
          for (const tagId of allTagIds) {
            await sql`
              INSERT INTO transaction_tags (transaction_id, tag_id)
              VALUES (${transaction.id}, ${tagId})
            `;
          }
        }

        // Update wallet balance
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${actualAmount}
          WHERE id = ${walletId}
        `;

        return { 
          success: true, 
          transaction,
          type: transactionType
        };
      }
    });

    res.status(201).json({
      message: "Transaction created successfully",
      ...result
    });

  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ 
      error: error.message || "Failed to create transaction" 
    });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction and update wallet balances
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // Begin transaction
    await sql.begin(async (sql) => {
      // Get transaction details before deleting
      const transaction = await sql`
        SELECT * FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (transaction.length === 0) {
        throw new Error("Transaction not found");
      }

      const txn = transaction[0];

      // Handle wallet balance updates and deletions based on transaction type
      if (txn.type === 'transfer') {
        // For transfers, find and delete the paired transaction
        // Match paired transaction by swapped wallets and created within 5 seconds
        const pairedTransaction = await sql`
          SELECT * FROM transactions 
          WHERE user_id = ${userId}
            AND type = 'transfer'
            AND wallet_id = ${txn.to_wallet_id}
            AND to_wallet_id = ${txn.wallet_id}
            AND id != ${id}
            AND created_at BETWEEN (${txn.created_at}::timestamp - interval '5 seconds') 
                               AND (${txn.created_at}::timestamp + interval '5 seconds')
          ORDER BY created_at DESC
          LIMIT 1
        `;

        // Reverse the balance change for the current transaction's wallet
        // If amount is negative (source wallet), subtracting it adds money back
        // If amount is positive (destination wallet), subtracting it removes money
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${txn.amount}
          WHERE id = ${txn.wallet_id} AND user_id = ${userId}
        `;

        // Delete transaction tags for current transaction
        await sql`
          DELETE FROM transaction_tags 
          WHERE transaction_id = ${id}
        `;

        // Delete the current transaction
        await sql`
          DELETE FROM transactions 
          WHERE id = ${id} AND user_id = ${userId}
        `;

        // If paired transaction exists, delete it too
        if (pairedTransaction.length > 0) {
          const paired = pairedTransaction[0];
          
          // Reverse the balance change for paired transaction's wallet
          await sql`
            UPDATE wallets 
            SET current_balance = current_balance - ${paired.amount}
            WHERE id = ${paired.wallet_id} AND user_id = ${userId}
          `;

          // Delete transaction tags for paired transaction
          await sql`
            DELETE FROM transaction_tags 
            WHERE transaction_id = ${paired.id}
          `;

          // Delete the paired transaction
          await sql`
            DELETE FROM transactions 
            WHERE id = ${paired.id} AND user_id = ${userId}
          `;
        }
      } else {
        // For income/expense, reverse the amount
        // Income has positive amount, expense has negative amount
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${txn.amount}
          WHERE id = ${txn.wallet_id} AND user_id = ${userId}
        `;

        // Delete transaction tags
        await sql`
          DELETE FROM transaction_tags 
          WHERE transaction_id = ${id}
        `;

        // Delete the transaction
        await sql`
          DELETE FROM transactions 
          WHERE id = ${id} AND user_id = ${userId}
        `;
      }
    });

    res.json({ 
      message: "Transaction deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ 
      error: error.message || "Failed to delete transaction" 
    });
  }
});

/**
 * PUT /api/transactions/:id
 * Update a transaction and recalculate wallet balances
 * 
 * Rate limits:
 * - 5 requests per 10 seconds
 * - 20 requests per hour
 * 
 * Requires Idempotency-Key header
 */
router.put("/:id", 
  authenticateToken, 
  transactionShortTermLimiter, 
  transactionLongTermLimiter, 
  idempotencyMiddleware, 
  async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const {
    amount,
    walletId,
    fromWalletId,
    toWalletId,
    category,
    suggestedTags = [],
    customTags = [],
    date,
    merchant,
    counterparty,
    description
  } = req.body;

  try {
    await sql.begin(async (sql) => {
      // Get the existing transaction
      const existingTxn = await sql`
        SELECT * FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (existingTxn.length === 0) {
        throw new Error("Transaction not found");
      }

      const oldTxn = existingTxn[0];

      // Validate amount
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        throw new Error("Valid positive amount is required");
      }

      const amountValue = parseFloat(amount);

      // Validate date
      if (!date) {
        throw new Error("Date is required");
      }

      // Validate merchant length
      if (merchant && merchant.length > 80) {
        throw new Error("Merchant must not exceed 80 characters");
      }

      // Validate counterparty length
      if (counterparty && counterparty.length > 80) {
        throw new Error("Counterparty must not exceed 80 characters");
      }

      // Validate description length
      if (description && description.length > 200) {
        throw new Error("Description must not exceed 200 characters");
      }

      if (oldTxn.type === 'transfer') {
        // TRANSFER UPDATE
        if (!fromWalletId || !toWalletId) {
          throw new Error("Both source and destination wallets are required for transfers");
        }

        if (fromWalletId === toWalletId) {
          throw new Error("Source and destination wallets must be different");
        }

        // Get wallets
        const [fromWallet] = await sql`
          SELECT * FROM wallets 
          WHERE id = ${fromWalletId} AND user_id = ${userId}
        `;

        const [toWallet] = await sql`
          SELECT * FROM wallets 
          WHERE id = ${toWalletId} AND user_id = ${userId}
        `;

        if (!fromWallet || !toWallet) {
          throw new Error("One or both wallets not found");
        }

        // Check overdraft for cash wallets only
        if (fromWallet.type === 'cash') {
          const balanceAfterReversal = fromWallet.current_balance - oldTxn.amount;
          const balanceAfterNewTxn = balanceAfterReversal - amountValue;
          
          if (balanceAfterNewTxn < 0) {
            throw new Error("Insufficient balance in source wallet. Cash wallets cannot be overdrawn.");
          }
        }

        // Find the paired transaction
        const pairedTxn = await sql`
          SELECT * FROM transactions 
          WHERE user_id = ${userId}
            AND type = 'transfer'
            AND wallet_id = ${oldTxn.to_wallet_id}
            AND to_wallet_id = ${oldTxn.wallet_id}
            AND date = ${oldTxn.date}
            AND id != ${id}
          ORDER BY id DESC
          LIMIT 1
        `;

        // Reverse old balance changes
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${oldTxn.amount}
          WHERE id = ${oldTxn.wallet_id} AND user_id = ${userId}
        `;

        if (pairedTxn.length > 0) {
          await sql`
            UPDATE wallets 
            SET current_balance = current_balance - ${pairedTxn[0].amount}
            WHERE id = ${pairedTxn[0].wallet_id} AND user_id = ${userId}
          `;
        }

        // Update the current transaction (source wallet)
        const [updatedFromTxn] = await sql`
          UPDATE transactions 
          SET 
            wallet_id = ${fromWalletId},
            to_wallet_id = ${toWalletId},
            amount = ${-amountValue},
            date = ${date},
            description = ${description || null},
            updated_at = NOW()
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING *
        `;

        // Update or create paired transaction (destination wallet)
        if (pairedTxn.length > 0) {
          await sql`
            UPDATE transactions 
            SET 
              wallet_id = ${toWalletId},
              to_wallet_id = ${fromWalletId},
              amount = ${amountValue},
              date = ${date},
              description = ${description || null},
              updated_at = NOW()
            WHERE id = ${pairedTxn[0].id} AND user_id = ${userId}
          `;
        } else {
          // Create paired transaction if it doesn't exist
          await sql`
            INSERT INTO transactions (
              user_id, wallet_id, to_wallet_id, type, amount, 
              currency, description, date, is_system
            )
            VALUES (
              ${userId}, ${toWalletId}, ${fromWalletId}, 'transfer', ${amountValue},
              ${toWallet.currency}, ${description || null}, ${date}, false
            )
          `;
        }

        // Apply new balance changes
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${amountValue}
          WHERE id = ${fromWalletId} AND user_id = ${userId}
        `;

        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${amountValue}
          WHERE id = ${toWalletId} AND user_id = ${userId}
        `;

        res.json({ 
          message: "Transfer updated successfully",
          transaction: updatedFromTxn
        });

      } else {
        // INCOME/EXPENSE UPDATE
        if (!category) {
          throw new Error("Category is required for income and expense transactions");
        }

        if (!walletId) {
          throw new Error("Wallet is required");
        }

        // Get wallet
        const [wallet] = await sql`
          SELECT * FROM wallets 
          WHERE id = ${walletId} AND user_id = ${userId}
        `;

        if (!wallet) {
          throw new Error("Wallet not found");
        }

        // Calculate actual amount based on type
        const actualAmount = oldTxn.type === 'expense' ? -amountValue : amountValue;

        // Check overdraft for cash wallets on expenses
        if (oldTxn.type === 'expense' && wallet.type === 'cash') {
          const balanceAfterReversal = wallet.current_balance - oldTxn.amount;
          const balanceAfterNewTxn = balanceAfterReversal + actualAmount;
          
          if (balanceAfterNewTxn < 0) {
            throw new Error("Insufficient balance. Cash wallets cannot be overdrawn.");
          }
        }

        // Reverse old balance change
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance - ${oldTxn.amount}
          WHERE id = ${oldTxn.wallet_id} AND user_id = ${userId}
        `;

        // Update transaction
        const [updatedTxn] = await sql`
          UPDATE transactions 
          SET 
            wallet_id = ${walletId},
            amount = ${actualAmount},
            category_id = ${category},
            merchant = ${merchant || null},
            counterparty = ${counterparty || null},
            description = ${description || null},
            date = ${date},
            updated_at = NOW()
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING *
        `;

        // Apply new balance change
        await sql`
          UPDATE wallets 
          SET current_balance = current_balance + ${actualAmount}
          WHERE id = ${walletId} AND user_id = ${userId}
        `;

        // Handle tags
        // Delete existing tag associations
        await sql`
          DELETE FROM transaction_tags 
          WHERE transaction_id = ${id}
        `;

        // Process tags
        const tagIds = [];

        // Add suggested tags
        for (const tagId of suggestedTags) {
          tagIds.push(tagId);
        }

        // Process custom tags
        for (const tag of customTags) {
          if (tag.isNew) {
            // Create new tag
            const [newTag] = await sql`
              INSERT INTO tags (name, user_id)
              VALUES (${tag.name}, ${userId})
              ON CONFLICT (name, user_id) DO UPDATE
              SET name = EXCLUDED.name
              RETURNING id
            `;
            tagIds.push(newTag.id);
          } else {
            tagIds.push(tag.id);
          }
        }

        // Insert tag associations
        if (tagIds.length > 0) {
          for (const tagId of tagIds) {
            await sql`
              INSERT INTO transaction_tags (transaction_id, tag_id)
              VALUES (${id}, ${tagId})
              ON CONFLICT (transaction_id, tag_id) DO NOTHING
            `;
          }
        }

        res.json({ 
          message: "Transaction updated successfully",
          transaction: updatedTxn
        });
      }
    });

  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ 
      error: error.message || "Failed to update transaction" 
    });
  }
});

export default router;
