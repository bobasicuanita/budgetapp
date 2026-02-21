import AppLayout from '../components/AppLayout';
import { Button, Stack, Text, Group, Box, Loader, Tooltip, Grid, Skeleton, Menu, ActionIcon, Checkbox, Modal, LoadingOverlay } from '@mantine/core';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useFilterDrawer } from '../contexts/FilterDrawerContext';
import { 
  IconActivity, 
  IconDownload, 
  IconCash,
  IconDotsVertical,
  IconTrash
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { useRipple } from '../hooks/useRipple';
import { useWallets } from '../hooks/useWallets';
import { useReferenceData } from '../hooks/useReferenceData';
import { useTransactions } from '../hooks/useTransactions';
import { authenticatedFetch } from '../utils/api';
import { MAX_AMOUNT, exceedsMaxAmount, getMaxAmountString, getMaxAmountDisplay } from '../utils/amountValidation';
import { 
  TransactionSummaryBoxes, 
  TransactionSearch, 
  TransactionDateFilter, 
  TransactionFilters, 
  TransactionDrawer, 
  TransactionList,
  DeleteConfirmationModal 
} from '../components/transactions';
import '../styles/inputs.css';
function Transactions() {
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpened, setDrawerOpened] = useState(false);
  
  // Use context for filter drawer state (lifted above router level)
  const { isOpen: isFiltersDrawerOpen, openDrawer, closeDrawer } = useFilterDrawer();
  
  // CSV export state
  const [isExporting, setIsExporting] = useState(false);
  const [canExportAgain, setCanExportAgain] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  const [editMode, setEditMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [originalValues, setOriginalValues] = useState(null);
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('expense');
  const [category, setCategory] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [fromWalletId, setFromWalletId] = useState(null);
  const [toWalletId, setToWalletId] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTags, setCustomTags] = useState([]); // Tags added manually (existing or new)
  const [date, setDate] = useState(new Date());
  const [merchant, setMerchant] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [description, setDescription] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagSearchValue, setTagSearchValue] = useState('');
  
  // Exchange rate state
  const [exchangeRateInfo, setExchangeRateInfo] = useState(null);
  const [manualExchangeRate, setManualExchangeRate] = useState('');
  const [checkingExchangeRate, setCheckingExchangeRate] = useState(false);
  
  // Date filter state - initialize from URL
  const [dateFilterType, setDateFilterType] = useState(() => searchParams.get('dateFilter') || 'thisMonth');
  const [dateRange, setDateRange] = useState(() => {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start && end) {
      return [new Date(start), new Date(end)];
    }
    return null;
  });
  
  // Advanced filters state - initialize from URL
  const [filterTransactionTypes, setFilterTransactionTypes] = useState(() => {
    const types = searchParams.get('types');
    return types ? types.split(',') : [];
  });
  const [filterWallets, setFilterWallets] = useState(() => {
    const wallets = searchParams.get('wallets');
    return wallets ? wallets.split(',') : [];
  });
  const [filterCategories, setFilterCategories] = useState(() => {
    const categories = searchParams.get('categories');
    return categories ? categories.split(',') : [];
  });
  const [filterTags, setFilterTags] = useState(() => {
    const tags = searchParams.get('tags');
    return tags ? tags.split(',') : [];
  });
  const [filterMinAmount, setFilterMinAmount] = useState(() => searchParams.get('minAmount') || '');
  const [filterMaxAmount, setFilterMaxAmount] = useState(() => searchParams.get('maxAmount') || '');
  const [filterCounterparty, setFilterCounterparty] = useState(() => searchParams.get('search') || '');
  const [filterIncludeFuture, setFilterIncludeFuture] = useState(() => searchParams.get('includeFuture') === 'true');
  const [filterCurrencyType, setFilterCurrencyType] = useState(() => searchParams.get('currencyType') || 'all');
  const [filterSelectedCurrency, setFilterSelectedCurrency] = useState(() => searchParams.get('currency') || 'all');
  
  // Search state
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(() => searchParams.get('search') || '');
  
  // Debounced versions of text/number inputs (500ms delay)
  const [debouncedMinAmount] = useDebouncedValue(filterMinAmount, 500);
  const [debouncedMaxAmount] = useDebouncedValue(filterMaxAmount, 500);
  const [debouncedCounterparty] = useDebouncedValue(filterCounterparty, 500);
  
  // Delete modal state
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  
  // Bulk delete state
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [bulkDeleteModalOpened, setBulkDeleteModalOpened] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  
  // Idempotency key for preventing duplicate submissions
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  
  // Ref for amount input to programmatically focus
  const amountInputRef = useRef(null);
  
  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef(null);

  const { data: walletsData, isLoading: walletsLoading } = useWallets();
  const { data: referenceData, isLoading: referenceLoading } = useReferenceData();
  
  // Calculate actual date range based on filter type
  const actualDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (dateFilterType) {
      case 'today':
        return [new Date(today), new Date(today)];
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return [yesterday, yesterday];
      }
      case 'last7days': {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        return [weekAgo, new Date(today)];
      }
      case 'lastMonth': {
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return [firstDayLastMonth, lastDayLastMonth];
      }
      case 'thisYear': {
        const firstDayThisYear = new Date(today.getFullYear(), 0, 1);
        const lastDayThisYear = new Date(today.getFullYear(), 11, 31);
        return [firstDayThisYear, lastDayThisYear];
      }
      case 'lastYear': {
        const firstDayLastYear = new Date(today.getFullYear() - 1, 0, 1);
        const lastDayLastYear = new Date(today.getFullYear() - 1, 11, 31);
        return [firstDayLastYear, lastDayLastYear];
      }
      case 'allTime': {
        const startOfTime = new Date(2000, 0, 1); // January 1, 2000
        return [startOfTime, new Date(today)];
      }
      case 'thisMonth': {
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return [firstDayThisMonth, lastDayThisMonth];
      }
      case 'custom':
        // Ensure dates are Date objects
        if (dateRange && dateRange[0] && dateRange[1]) {
          return [
            dateRange[0] instanceof Date ? dateRange[0] : new Date(dateRange[0]),
            dateRange[1] instanceof Date ? dateRange[1] : new Date(dateRange[1])
          ];
        }
        return dateRange;
      default:
        return null;
    }
  }, [dateFilterType, dateRange]);
  
  // Build transaction filters
  const transactionFilters = useMemo(() => {
    const filters = {
      include_future: filterIncludeFuture ? 'true' : 'false'
    };
    
    // Date range
    if (actualDateRange && actualDateRange[0] && actualDateRange[1]) {
      const formatDate = (date) => {
        // Ensure date is a Date object
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      filters.start_date = formatDate(actualDateRange[0]);
      filters.end_date = formatDate(actualDateRange[1]);
    }
    
    // Transaction type (comma-separated if multiple selected)
    if (filterTransactionTypes.length > 0 && filterTransactionTypes.length < 3) {
      filters.type = filterTransactionTypes.join(',');
    }
    
    // Wallets (comma-separated IDs for multi-select)
    if (filterWallets.length > 0) {
      filters.wallet_ids = filterWallets.join(',');
    }
    
    // Categories (comma-separated UUIDs for multi-select)
    if (filterCategories.length > 0) {
      filters.category_ids = filterCategories.join(',');
    }
    
    // Tags (comma-separated UUIDs) - Backend uses OR logic currently
    if (filterTags.length > 0) {
      filters.tag_ids = filterTags.join(',');
    }
    
    // Amount range (debounced)
    if (debouncedMinAmount) {
      filters.min_amount = debouncedMinAmount;
    }
    if (debouncedMaxAmount) {
      filters.max_amount = debouncedMaxAmount;
    }
    
    // Search query (manual trigger) - combines search bar and filter drawer
    if (appliedSearchQuery.trim()) {
      filters.search = appliedSearchQuery.trim();
    } else if (debouncedCounterparty.trim()) {
      filters.search = debouncedCounterparty.trim();
    }
    
    // Currency filter
    if (filterCurrencyType === 'base') {
      filters.currency = walletsData?.baseCurrency || 'USD';
    } else if (filterCurrencyType === 'others') {
      if (filterSelectedCurrency && filterSelectedCurrency !== 'all') {
        filters.currency = filterSelectedCurrency;
      } else {
        // "Others" with "All" selected - exclude base currency
        filters.exclude_base_currency = 'true';
      }
    }
    
    return filters;
  }, [
    actualDateRange, 
    filterTransactionTypes, 
    filterWallets, 
    filterCategories, 
    filterTags, 
    debouncedMinAmount, 
    debouncedMaxAmount, 
    appliedSearchQuery,
    debouncedCounterparty,
    filterIncludeFuture,
    filterCurrencyType,
    filterSelectedCurrency,
    walletsData
  ]);
  
  const { 
    data: transactionsData, 
    isLoading: transactionsLoading,
    isFetching: transactionsFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useTransactions(transactionFilters);
  
  // Check if user has applied any filters (not the default "This Month")
  // Check if user has applied any filters beyond defaults
  const hasActiveFilters = useMemo(() => {
    return dateFilterType !== 'thisMonth' ||
           filterTransactionTypes.length > 0 ||
           filterWallets.length > 0 ||
           filterCategories.length > 0 ||
           filterTags.length > 0 ||
           filterMinAmount !== '' ||
           filterMaxAmount !== '' ||
           appliedSearchQuery.trim() !== '' ||
           filterCounterparty.trim() !== '' ||
           filterIncludeFuture === true ||
           filterCurrencyType !== 'all';
  }, [
    dateFilterType,
    filterTransactionTypes,
    filterWallets,
    filterCategories,
    filterTags,
    filterMinAmount,
    filterMaxAmount,
    appliedSearchQuery,
    filterCounterparty,
    filterIncludeFuture,
    filterCurrencyType
  ]);


  // Track if we're transitioning from filtered to unfiltered state
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check exchange rate availability when date or wallet currency changes
  const checkExchangeRate = useCallback(async (dateToCheck, currencyToCheck) => {
    if (!dateToCheck || !currencyToCheck) return;
    
    // Format date to YYYY-MM-DD
    const dateObj = dateToCheck instanceof Date ? dateToCheck : new Date(dateToCheck);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    setCheckingExchangeRate(true);
    
    try {
      const response = await authenticatedFetch(
        `/api/exchange-rates/availability?date=${formattedDate}&currency=${currencyToCheck}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setExchangeRateInfo(data);
        
        // Clear manual rate if exact match found or if not required
        if (data.exactMatch || !data.requiresManualInput) {
          setManualExchangeRate('');
        }
      } else {
        console.error('Failed to check exchange rate');
        setExchangeRateInfo(null);
      }
    } catch (error) {
      console.error('Error checking exchange rate:', error);
      setExchangeRateInfo(null);
    } finally {
      setCheckingExchangeRate(false);
    }
  }, []);

  // Check exchange rate when date or wallet changes (only when drawer is open)
  useEffect(() => {
    if (!drawerOpened) return;
    
    let currencyToCheck = null;
    let shouldCheck = false;
    
    // Determine which currency to check based on transaction type
    if (transactionType === 'transfer') {
      // For transfers, check if wallets have different currencies
      const fromWallet = walletsData?.wallets?.find(w => w.id === parseInt(fromWalletId));
      const toWallet = walletsData?.wallets?.find(w => w.id === parseInt(toWalletId));
      const userBaseCurrency = walletsData?.baseCurrency || 'USD';
      
      // Only check if both wallets selected and currencies are different
      if (fromWallet && toWallet && fromWallet.currency !== toWallet.currency) {
        // Check the non-base currency wallet
        // If FROM is base currency, check TO wallet; otherwise check FROM wallet
        if (fromWallet.currency === userBaseCurrency) {
          currencyToCheck = toWallet.currency;
        } else {
          currencyToCheck = fromWallet.currency;
        }
        shouldCheck = true;
      }
    } else {
      // For income/expense, check the selected wallet currency
      const wallet = walletsData?.wallets?.find(w => w.id === parseInt(walletId));
      currencyToCheck = wallet?.currency;
      shouldCheck = currencyToCheck !== undefined;
    }
    
    if (shouldCheck && currencyToCheck && date) {
      checkExchangeRate(date, currencyToCheck);
    } else {
      // Clear exchange rate info if conditions not met
      setExchangeRateInfo(null);
      setManualExchangeRate('');
    }
  }, [drawerOpened, date, walletId, fromWalletId, toWalletId, transactionType, walletsData, checkExchangeRate]);

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData) => {
      if (!idempotencyKey) {
        throw new Error('Idempotency key is missing. Please try again.');
      }

      const response = await authenticatedFetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        const error = await response.json();
        // Create error object with status code for special handling
        const errorObj = new Error(error.error || 'Failed to create transaction');
        errorObj.status = response.status;
        errorObj.retryAfter = error.retryAfter;
        throw errorObj;
      }

      return response.json();
    },
    onSuccess: () => {
      // Close drawer and reset form
      handleCloseDrawer();
      
      // Invalidate wallet queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      
      // Invalidate transactions queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Show success notification
      showSuccessNotification('Transaction created successfully');
    },
    onError: (error) => {
      // Handle rate limit error (429) with special styling
      if (error.status === 429) {
        showErrorNotification(
          error.message || 'You are creating transactions too quickly. Please wait a moment and try again.',
          'Rate Limit Exceeded',
          { color: 'red.9' }
        );
      } else {
        // Show regular error notification
        showErrorNotification(error.message || 'Failed to create transaction');
      }
    }
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, transactionData }) => {
      if (!idempotencyKey) {
        throw new Error('Idempotency key is missing. Please try again.');
      }

      const response = await authenticatedFetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        const error = await response.json();
        // Create error object with status code for special handling
        const errorObj = new Error(error.error || 'Failed to update transaction');
        errorObj.status = response.status;
        errorObj.retryAfter = error.retryAfter;
        throw errorObj;
      }

      return response.json();
    },
    onSuccess: () => {
      // Close drawer and reset form
      handleCloseDrawer();
      
      // Invalidate wallet queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      
      // Invalidate transactions queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Show success notification
      showSuccessNotification('Transaction updated successfully');
    },
    onError: (error) => {
      // Handle rate limit error (429) with special styling
      if (error.status === 429) {
        showErrorNotification(
          error.message || 'You are creating transactions too quickly. Please wait a moment and try again.',
          'Rate Limit Exceeded',
          { color: 'red.9' }
        );
      } else {
        // Show regular error notification
        showErrorNotification(error.message || 'Failed to update transaction');
      }
    }
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId) => {
      const response = await authenticatedFetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      return response.json();
    },
    onSuccess: () => {
      // Close modal
      setDeleteModalOpened(false);
      setTransactionToDelete(null);
      
      // Invalidate wallet queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      
      // Invalidate transactions queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Show success notification
      showSuccessNotification('Transaction deleted.');
    },
    onError: (error) => {
      // Show error notification
      showErrorNotification(error.message || 'Failed to delete transaction');
    }
  });

  // Bulk delete transactions mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (transactionIds) => {
      const response = await authenticatedFetch(`/api/transactions/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transactions');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Close modal and reset bulk delete state
      setBulkDeleteModalOpened(false);
      setBulkDeleteMode(false);
      setSelectedTransactions([]);
      setIsSelectingAll(false);
      
      // Invalidate wallet queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      
      // Invalidate transactions queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Show success notification
      const count = data.count || selectedTransactions.length;
      showSuccessNotification(`${count} ${count === 1 ? 'transaction' : 'transactions'} deleted.`);
    },
    onError: (error) => {
      // Show error notification
      showErrorNotification(error.message || 'Failed to delete transactions');
    }
  });


  // Filter categories based on transaction type
  // Exclude system transaction categories (Initial Balance, Balance Adjustment) from user selection
  const filteredCategories = useMemo(() => {
    if (!referenceData?.categories) return [];

    const systemTransactionCategories = ['Initial Balance', 'Balance Adjustment'];

    if (transactionType === 'income') {
      return referenceData.categories.filter(cat => 
        cat.type === 'income' && !systemTransactionCategories.includes(cat.name)
      );
    } else if (transactionType === 'expense') {
      return referenceData.categories.filter(cat => 
        cat.type === 'expense' && !systemTransactionCategories.includes(cat.name)
      );
    }
    
    return [];
  }, [referenceData, transactionType]);

  // Get suggested tags based on selected category
  const suggestedTags = useMemo(() => {
    if (!category || !referenceData?.categoryTagSuggestions || !referenceData?.tags) return [];
    
    // Get tag IDs suggested for this category
    const suggestedTagIds = referenceData.categoryTagSuggestions
      .filter(suggestion => suggestion.category_id === category)
      .map(suggestion => suggestion.tag_id);
    
    // Get full tag objects
    return referenceData.tags.filter(tag => suggestedTagIds.includes(tag.id));
  }, [category, referenceData]);

  // Filter To Wallet list to exclude From Wallet
  const toWalletOptions = useMemo(() => {
    if (!walletsData?.wallets) return [];
    
    return walletsData.wallets
      .filter(wallet => wallet.id.toString() !== fromWalletId)
      .map(wallet => ({
        value: wallet.id.toString(),
        label: wallet.name,
        wallet: wallet
      }));
  }, [walletsData, fromWalletId]);

  // Check if amount exceeds wallet balance for expense transactions
  const walletBalanceWarning = useMemo(() => {
    if (transactionType !== 'expense' || !walletId || !amount || !walletsData?.wallets) {
      return null;
    }

    const selectedWallet = walletsData.wallets.find(w => w.id.toString() === walletId);
    if (!selectedWallet) return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    if (amountNum > selectedWallet.current_balance) {
      const difference = amountNum - selectedWallet.current_balance;
      return {
        difference,
        currency: selectedWallet.currency,
        walletType: selectedWallet.type
      };
    }

    return null;
  }, [transactionType, walletId, amount, walletsData]);

  // Check if amount exceeds from wallet balance for transfers
  const fromWalletBalanceWarning = useMemo(() => {
    if (transactionType !== 'transfer' || !fromWalletId || !amount || !walletsData?.wallets) {
      return null;
    }

    const selectedWallet = walletsData.wallets.find(w => w.id.toString() === fromWalletId);
    if (!selectedWallet) return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    if (amountNum > selectedWallet.current_balance) {
      const difference = amountNum - selectedWallet.current_balance;
      return {
        difference,
        currency: selectedWallet.currency,
        walletType: selectedWallet.type
      };
    }

    return null;
  }, [transactionType, fromWalletId, amount, walletsData]);

  // Check if amount would cause numeric overflow
  const amountOverflowWarning = useMemo(() => {
    if (!amount || !walletsData?.wallets || walletsData.totalNetWorth === undefined) return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    const netWorth = walletsData.totalNetWorth;
    const baseCurrency = walletsData.baseCurrency || 'USD';
    
    // Get the relevant wallet's currency for validation
    let walletCurrency = baseCurrency;
    if (transactionType === 'income' || transactionType === 'expense') {
      const selectedWallet = walletsData.wallets.find(w => w.id.toString() === walletId);
      if (selectedWallet) {
        walletCurrency = selectedWallet.currency;
      }
    } else if (transactionType === 'transfer' && fromWalletId) {
      const fromWallet = walletsData.wallets.find(w => w.id.toString() === fromWalletId);
      if (fromWallet) {
        walletCurrency = fromWallet.currency;
      }
    }

    // Check if amount itself exceeds currency-specific maximum
    if (exceedsMaxAmount(amount, walletCurrency)) {
      return {
        type: 'amount_overflow',
        maxAllowedString: getMaxAmountString(walletCurrency),
        maxAllowedDisplay: getMaxAmountDisplay(walletCurrency),
        currency: walletCurrency,
        message: `Maximum transaction amount for ${walletCurrency} is ${getMaxAmountDisplay(walletCurrency)}`
      };
    }

    // Check if transaction would cause net worth to exceed maximum
    if (transactionType === 'income' && walletId) {
      const newNetWorth = netWorth + amountNum;
      if (newNetWorth > MAX_AMOUNT) {
        const maxAllowed = MAX_AMOUNT - netWorth;
        return {
          type: 'networth_overflow',
          maxAllowed,
          currency: baseCurrency,
          currentNetWorth: netWorth
        };
      }
    } else if (transactionType === 'transfer' && toWalletId) {
      // Transfers don't change net worth, but check if destination wallet exists
      const selectedWallet = walletsData.wallets.find(w => w.id.toString() === toWalletId);
      if (selectedWallet) {
        const newWalletBalance = selectedWallet.current_balance + amountNum;
        if (newWalletBalance > MAX_AMOUNT) {
          const maxAllowed = MAX_AMOUNT - selectedWallet.current_balance;
          return {
            type: 'wallet_overflow',
            maxAllowed,
            currency: selectedWallet.currency,
            currentBalance: selectedWallet.current_balance,
            walletName: selectedWallet.name
          };
        }
      }
    }

    return null;
  }, [amount, transactionType, walletId, fromWalletId, toWalletId, walletsData]);

  // Calculate dynamic max amount for NumberInput (prevents clamping to wrong value on blur)
  const maxAllowedAmount = useMemo(() => {
    if (!walletsData?.wallets || walletsData.totalNetWorth === undefined) return MAX_AMOUNT;

    // Get the relevant wallet's currency
    let walletCurrency = walletsData.baseCurrency || 'USD';
    if (transactionType === 'income' || transactionType === 'expense') {
      const selectedWallet = walletsData.wallets.find(w => w.id.toString() === walletId);
      if (selectedWallet) {
        walletCurrency = selectedWallet.currency;
      }
    } else if (transactionType === 'transfer' && fromWalletId) {
      const fromWallet = walletsData.wallets.find(w => w.id.toString() === fromWalletId);
      if (fromWallet) {
        walletCurrency = fromWallet.currency;
      }
    }
    
    // Use currency-specific maximum
    return parseFloat(getMaxAmountString(walletCurrency));
  }, [transactionType, walletId, fromWalletId, walletsData]);

  // Check if transaction should be blocked (only cash wallets cannot be overdrawn)
  const isOverdraftBlocked = useMemo(() => {
    // Block if amount overflow
    if (amountOverflowWarning) {
      return true;
    }
    
    // For expense transactions
    if (transactionType === 'expense' && walletBalanceWarning) {
      return walletBalanceWarning.walletType === 'cash';
    }
    
    // For transfer transactions
    if (transactionType === 'transfer' && fromWalletBalanceWarning) {
      return fromWalletBalanceWarning.walletType === 'cash';
    }
    
    return false;
  }, [transactionType, walletBalanceWarning, fromWalletBalanceWarning, amountOverflowWarning]);

  // Check if selected date is in the future (tomorrow or later)
  const isFutureDate = useMemo(() => {
    if (!date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate > today;
  }, [date]);

  // Derive quick date selection from date
  const quickDateSelection = useMemo(() => {
    if (!date) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - selectedDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays === 2) {
      return '2days';
    } else {
      return null; // Custom date
    }
  }, [date]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    if (!transactionsData?.pages) return [];

    const groups = {};
    
    // Get today's date in local timezone
    const today = new Date();

    // Flatten all pages and process transactions
    const allTransactions = transactionsData.pages.flatMap(page => page.transactions || []);

    allTransactions.forEach(transaction => {
      // Parse date from YYYY-MM-DD format (no timezone conversion)
      const transactionDateStr = transaction.date.split('T')[0]; // Get just the date part
      const [year, month, day] = transactionDateStr.split('-').map(Number);
      const transactionDate = new Date(year, month - 1, day);
      
      // Calculate difference in days
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffTime = todayDate - transactionDate;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      let dateLabel;
      const formattedDate = transactionDate.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      if (diffDays === 0) {
        dateLabel = `Today (${formattedDate})`;
      } else if (diffDays === 1) {
        dateLabel = `Yesterday (${formattedDate})`;
      } else {
        dateLabel = formattedDate;
      }
      
      if (!groups[dateLabel]) {
        groups[dateLabel] = {
          label: dateLabel,
          date: transactionDate,
          transactions: [],
          sum: 0,
          currency: walletsData?.baseCurrency || 'USD' // Use user's base currency
        };
      }
      
      groups[dateLabel].transactions.push(transaction);
      // Calculate daily sum (exclude transfers and system transactions)
      // Use base_currency_amount for proper multi-currency support
      if (transaction.type !== 'transfer' && !transaction.is_system) {
        const baseAmount = transaction.base_currency_amount !== null && transaction.base_currency_amount !== undefined
          ? parseFloat(transaction.base_currency_amount)
          : parseFloat(transaction.amount); // Fallback for old transactions without base_currency_amount
        groups[dateLabel].sum += baseAmount || 0;
      }
    });

    // Convert to array and sort by date descending
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [transactionsData, walletsData]);

  // Get all selected tag IDs (both suggested and custom)
  const allSelectedTagIds = useMemo(() => {
    return [...selectedTags, ...customTags.map(t => t.id)];
  }, [selectedTags, customTags]);

  // Check if max tags reached (5 total)
  const maxTagsReached = useMemo(() => {
    return allSelectedTagIds.length >= 5;
  }, [allSelectedTagIds]);

  // Get available tags for search (only user-created tags, exclude already selected)
  const availableTagsForSearch = useMemo(() => {
    if (!referenceData?.tags) return [];
    
    return referenceData.tags
      .filter(tag => !tag.is_system && !allSelectedTagIds.includes(tag.id))
      .map(tag => ({
        value: tag.id,
        label: tag.name,
        tag: tag
      }));
  }, [referenceData, allSelectedTagIds]);

  // Handle transaction type change and reset related fields
  const handleTransactionTypeChange = (newType) => {
    setTransactionType(newType);
    setCategory(null);
    setFromWalletId(null);
    setToWalletId(null);
    setMerchant('');
    setCounterparty('');
  };

  // Handle category change and reset tags
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setSelectedTags([]);
    setCustomTags([]);
    setShowTagInput(false);
    setTagSearchValue('');
  };

  // Handle from wallet change and reset to wallet
  const handleFromWalletChange = (newFromWalletId) => {
    setFromWalletId(newFromWalletId);
    setToWalletId(null);
  };

  const handleCloseDrawer = () => {
    setDrawerOpened(false);
    // Reset form
    setEditMode(false);
    setEditingTransaction(null);
    setOriginalValues(null);
    setAmount('');
    setTransactionType('expense');
    setCategory(null);
    setWalletId(null);
    setFromWalletId(null);
    setToWalletId(null);
    setSelectedTags([]);
    setCustomTags([]);
    setDate(new Date());
    setMerchant('');
    // Reset exchange rate state
    setExchangeRateInfo(null);
    setManualExchangeRate('');
    setCheckingExchangeRate(false);
    setCounterparty('');
    setDescription('');
    setShowTagInput(false);
    setTagSearchValue('');
    setIdempotencyKey(null);
  };

  // Handle clearing all filters (including date and excluding search)
  const handleClearAllFilters = useCallback(() => {
    // Set transitioning state to prevent empty state flash
    setIsTransitioning(true);
    
    setFilterTransactionTypes([]);
    setFilterWallets([]);
    setFilterCategories([]);
    setFilterTags([]);
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterCounterparty('');
    setFilterIncludeFuture(false);
    setFilterCurrencyType('all');
    setFilterSelectedCurrency('all');
    
    // Clear date filter
    setDateFilterType('thisMonth');
    setDateRange(null);
    
    // Fallback: Clear transitioning state after a longer timeout in case data never arrives
    setTimeout(() => setIsTransitioning(false), 2000);
  }, []);

  // Handle CSV download with all current filters
  const handleDownloadCSV = async () => {
    if (isExporting || !canExportAgain) return;
    
    try {
      // Set exporting state
      setIsExporting(true);
      
      // Build query parameters from all filter states
      const params = new URLSearchParams();
      
      // Date filters
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append('start_date', dayjs(dateRange[0]).format('YYYY-MM-DD'));
        params.append('end_date', dayjs(dateRange[1]).format('YYYY-MM-DD'));
      } else if (dateFilterType === 'thisMonth') {
        const now = dayjs();
        params.append('start_date', now.startOf('month').format('YYYY-MM-DD'));
        params.append('end_date', now.endOf('month').format('YYYY-MM-DD'));
      } else if (dateFilterType === 'lastMonth') {
        const lastMonth = dayjs().subtract(1, 'month');
        params.append('start_date', lastMonth.startOf('month').format('YYYY-MM-DD'));
        params.append('end_date', lastMonth.endOf('month').format('YYYY-MM-DD'));
      } else if (dateFilterType === 'thisYear') {
        const now = dayjs();
        params.append('start_date', now.startOf('year').format('YYYY-MM-DD'));
        params.append('end_date', now.endOf('year').format('YYYY-MM-DD'));
      } else if (dateFilterType === 'lastYear') {
        const lastYear = dayjs().subtract(1, 'year');
        params.append('start_date', lastYear.startOf('year').format('YYYY-MM-DD'));
        params.append('end_date', lastYear.endOf('year').format('YYYY-MM-DD'));
      } else if (dateFilterType === 'allTime') {
        params.append('start_date', '2000-01-01');
        params.append('end_date', dayjs().format('YYYY-MM-DD'));
      }
      
      // Transaction types
      if (filterTransactionTypes.length > 0) {
        params.append('type', filterTransactionTypes.join(','));
      }
      
      // Wallets
      if (filterWallets.length > 0) {
        params.append('wallet_ids', filterWallets.join(','));
      }
      
      // Categories
      if (filterCategories.length > 0) {
        params.append('category_ids', filterCategories.join(','));
      }
      
      // Tags
      if (filterTags.length > 0) {
        params.append('tag_ids', filterTags.join(','));
      }
      
      // Search
      if (appliedSearchQuery) {
        params.append('search', appliedSearchQuery);
      }
      
      // Amount range
      if (filterMinAmount) {
        params.append('min_amount', filterMinAmount);
      }
      if (filterMaxAmount) {
        params.append('max_amount', filterMaxAmount);
      }
      
      // Include future
      if (filterIncludeFuture) {
        params.append('include_future', 'true');
      }
      
      // Fetch CSV from backend
      const response = await authenticatedFetch(`/api/transactions/csv?${params.toString()}`);
      
      // Handle errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          // Rate limit exceeded
          notifications.show({
            title: 'Too Many Exports',
            message: errorData.error || "You're exporting too frequently. Please try again in a moment.",
            color: 'red',
            position: 'bottom-right',
            autoClose: 5000
          });
          setIsExporting(false);
          return;
        }
        
        if (response.status === 400 && errorData.error?.includes('too large')) {
          // Export too large
          notifications.show({
            title: 'Export Too Large',
            message: errorData.error || "Your export is too large. Please narrow your date range.",
            color: 'red',
            position: 'bottom-right',
            autoClose: 5000
          });
          setIsExporting(false);
          return;
        }
        
        throw new Error('Failed to download CSV');
      }
      
      // Get the CSV content as blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${dayjs().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // After download starts, disable for a few seconds with countdown
      setCanExportAgain(false);
      setCooldownSeconds(5);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setCanExportAgain(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      showSuccessNotification('CSV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to download transactions. Please try again.',
        color: 'red',
        position: 'bottom-right',
        autoClose: 5000
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenEditDrawer = useCallback((transaction) => {
    setEditMode(true);
    setEditingTransaction(transaction);
    
    // Pre-fill form with transaction data
    setAmount(Math.abs(transaction.amount).toString());
    setTransactionType(transaction.type);
    setDate(new Date(transaction.date));
    setDescription(transaction.description || '');
    
    if (transaction.type === 'transfer') {
      // For transfers, set from/to wallets
      // The current transaction represents one side
      // We need to determine if this is the "from" or "to" side
      if (transaction.amount < 0) {
        // This is the "from" wallet (negative amount)
        setFromWalletId(transaction.wallet_id.toString());
        setToWalletId(transaction.to_wallet_id.toString());
      } else {
        // This is the "to" wallet (positive amount), swap them
        setFromWalletId(transaction.to_wallet_id.toString());
        setToWalletId(transaction.wallet_id.toString());
      }
    } else {
      // For income/expense
      setWalletId(transaction.wallet_id.toString());
      setCategory(transaction.category_id.toString());
      setMerchant(transaction.merchant || '');
      setCounterparty(transaction.counterparty || '');
      
      // Set tags - separate suggested vs custom
      if (transaction.tags && transaction.tags.length > 0) {
        // Get suggested tag IDs for this category
        const suggestedTagIds = referenceData?.categoryTagSuggestions
          ?.filter(cts => cts.category_id === transaction.category_id)
          ?.map(cts => cts.tag_id) || [];
        
        // Separate tags into suggested and custom
        const suggested = [];
        const custom = [];
        
        transaction.tags.forEach(tag => {
          if (suggestedTagIds.includes(tag.id)) {
            suggested.push(tag.id);
          } else {
            custom.push({
              id: tag.id,
              name: tag.name,
              isNew: false
            });
          }
        });
        
        setSelectedTags(suggested);
        setCustomTags(custom);
      }
    }
    
    // Store original values for change detection
    // Format date to YYYY-MM-DD (same format used in hasChanges comparison)
    const originalDate = new Date(transaction.date);
    const originalDateString = `${originalDate.getFullYear()}-${String(originalDate.getMonth() + 1).padStart(2, '0')}-${String(originalDate.getDate()).padStart(2, '0')}`;
    
    // Store only relevant fields based on transaction type
    if (transaction.type === 'transfer') {
      setOriginalValues({
        amount: Math.abs(transaction.amount).toString(),
        transactionType: transaction.type,
        fromWalletId: transaction.amount < 0 ? transaction.wallet_id?.toString() : transaction.to_wallet_id?.toString(),
        toWalletId: transaction.amount < 0 ? transaction.to_wallet_id?.toString() : transaction.wallet_id?.toString(),
        date: originalDateString,
        description: transaction.description || ''
      });
    } else {
      setOriginalValues({
        amount: Math.abs(transaction.amount).toString(),
        transactionType: transaction.type,
        category: transaction.category_id?.toString(),
        walletId: transaction.wallet_id?.toString(),
        date: originalDateString,
        merchant: transaction.merchant || '',
        counterparty: transaction.counterparty || '',
        description: transaction.description || '',
        tags: transaction.tags ? transaction.tags.map(t => t.id).sort().join(',') : ''
      });
    }
    
    // Generate new idempotency key for this edit
    setIdempotencyKey(uuidv4());
    setDrawerOpened(true);
  }, [referenceData]);

  const handleOpenDeleteModal = useCallback((transaction) => {
    setTransactionToDelete(transaction);
    setDeleteModalOpened(true);
  }, []);

  // Note: openDrawer and closeDrawer come from context and are already stable

  const handleTransactionSubmit = () => {
    // Format date to YYYY-MM-DD using local date (avoid timezone issues)
    const dateObj = date instanceof Date ? date : new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // Prepare transaction data
    const transactionData = {
      amount: parseFloat(amount),
      date: formattedDate,
      description: description || null,
      suggestedTags: selectedTags,
      customTags: customTags
    };

    // Add manual exchange rate if provided
    if (manualExchangeRate && parseFloat(manualExchangeRate) > 0) {
      transactionData.manualExchangeRate = parseFloat(manualExchangeRate);
    }

    // Add type-specific fields
    if (transactionType === 'transfer') {
      transactionData.fromWalletId = fromWalletId;
      transactionData.toWalletId = toWalletId;
    } else {
      transactionData.walletId = walletId;
      transactionData.category = category;
      
      // Add merchant for expenses only
      if (transactionType === 'expense' && merchant) {
        transactionData.merchant = merchant;
      }
      
      // Add counterparty for income only
      if (transactionType === 'income' && counterparty) {
        transactionData.counterparty = counterparty;
      }
    }

    // Create or update transaction
    if (editMode) {
      updateTransactionMutation.mutate({
        transactionId: editingTransaction.id,
        transactionData
      });
    } else {
      transactionData.transactionType = transactionType;
      createTransactionMutation.mutate(transactionData);
    }
  };

  const handleAddTag = (value) => {
    if (!value || maxTagsReached) return;

    // Check if it's a new tag (starts with "create:")
    if (value.startsWith('create:')) {
      const tagName = value.replace('create:', '');
      // Create a temporary tag object (will be created when transaction is submitted)
      const newTag = {
        id: `new-${Date.now()}`, // Temporary ID
        name: tagName,
        isNew: true
      };
      setCustomTags(prev => [...prev, newTag]);
    } else {
      // It's an existing tag ID
      const existingTag = referenceData?.tags.find(t => t.id === value);
      if (existingTag) {
        setCustomTags(prev => [...prev, existingTag]);
      }
    }

    // Reset input state
    setShowTagInput(false);
    setTagSearchValue('');
  };

  const handleRemoveCustomTag = (tagId) => {
    setCustomTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleQuickDateSelect = (selection) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let newDate = new Date(today);
    
    if (selection === 'yesterday') {
      newDate.setDate(today.getDate() - 1);
    } else if (selection === '2days') {
      newDate.setDate(today.getDate() - 2);
    }
    // 'today' uses current date
    
    setDate(newDate);
  };

  // Check if there are any changes in edit mode
  const hasChanges = useMemo(() => {
    if (!editMode || !originalValues) return false;
    
    // Helper to normalize values for comparison (handle null/undefined/numbers)
    const normalize = (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    };
    
    // Helper to format date to YYYY-MM-DD for comparison (ignoring time)
    const formatDateForComparison = (dateValue) => {
      if (!dateValue) return '';
      const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
      // Check if date is valid
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const currentDateString = formatDateForComparison(date);
    const originalDateString = originalValues.date;
    
    const currentTagsString = transactionType === 'transfer' 
      ? '' 
      : [...selectedTags, ...customTags.map(t => t.id)].sort().join(',');
    
    if (transactionType === 'transfer') {
      return (
        normalize(amount) !== normalize(originalValues.amount) ||
        normalize(fromWalletId) !== normalize(originalValues.fromWalletId || '') ||
        normalize(toWalletId) !== normalize(originalValues.toWalletId || '') ||
        currentDateString !== originalDateString ||
        normalize(description) !== normalize(originalValues.description)
      );
    } else {
      return (
        normalize(amount) !== normalize(originalValues.amount) ||
        normalize(category) !== normalize(originalValues.category || '') ||
        normalize(walletId) !== normalize(originalValues.walletId || '') ||
        currentDateString !== originalDateString ||
        normalize(merchant) !== normalize(originalValues.merchant || '') ||
        normalize(counterparty) !== normalize(originalValues.counterparty || '') ||
        normalize(description) !== normalize(originalValues.description) ||
        currentTagsString !== (originalValues.tags || '')
      );
    }
  }, [editMode, originalValues, amount, category, walletId, fromWalletId, toWalletId, date, merchant, counterparty, description, selectedTags, customTags, transactionType]);

  // Focus amount input when drawer opens
  useEffect(() => {
    if (drawerOpened && amountInputRef.current) {
      // Small delay to wait for drawer animation
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [drawerOpened]);

  // Infinite scroll: Load more transactions when sentinel is visible
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Load more when sentinel is visible and there are more pages
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // Start loading 100px before sentinel is visible
        threshold: 0.1
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Date filter
    if (dateFilterType && dateFilterType !== 'thisMonth') {
      params.set('dateFilter', dateFilterType);
    }
    
    // Custom date range
    if (dateRange && dateRange[0] && dateRange[1]) {
      const formatDate = (date) => {
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      params.set('startDate', formatDate(dateRange[0]));
      params.set('endDate', formatDate(dateRange[1]));
    }
    
    // Transaction types
    if (filterTransactionTypes.length > 0) {
      params.set('types', filterTransactionTypes.join(','));
    }
    
    // Wallets
    if (filterWallets.length > 0) {
      params.set('wallets', filterWallets.join(','));
    }
    
    // Categories
    if (filterCategories.length > 0) {
      params.set('categories', filterCategories.join(','));
    }
    
    // Tags
    if (filterTags.length > 0) {
      params.set('tags', filterTags.join(','));
    }
    
    // Amount range (debounced)
    if (debouncedMinAmount) {
      params.set('minAmount', debouncedMinAmount);
    }
    if (debouncedMaxAmount) {
      params.set('maxAmount', debouncedMaxAmount);
    }
    
    // Search query (manual trigger) - prioritize search bar over filter drawer
    if (appliedSearchQuery.trim()) {
      params.set('search', appliedSearchQuery.trim());
    } else if (debouncedCounterparty.trim()) {
      params.set('search', debouncedCounterparty.trim());
    }
    
    // Include future
    if (filterIncludeFuture) {
      params.set('includeFuture', 'true');
    }
    
    // Update URL without triggering navigation (uses replaceState, not pushState)
    setSearchParams(params, { replace: true });
  }, [
    dateFilterType,
    dateRange,
    filterTransactionTypes,
    filterWallets,
    filterCategories,
    filterTags,
    debouncedMinAmount,
    debouncedMaxAmount,
    appliedSearchQuery,
    debouncedCounterparty,
    filterIncludeFuture,
    setSearchParams
  ]);

  // Get drawer title based on mode and transaction type
  const drawerTitle = useMemo(() => {
    if (!editMode) return 'Add new transaction';
    if (transactionType === 'income') return 'Edit Income';
    if (transactionType === 'expense') return 'Edit Expense';
    return 'Edit Transfer';
  }, [editMode, transactionType]);

  // Get all visible transaction IDs for bulk delete
  const allVisibleTransactionIds = useMemo(() => {
    return groupedTransactions.flatMap(group => 
      group.transactions.map(t => t.id)
    );
  }, [groupedTransactions]);

  // Check if all visible transactions are selected
  const allSelected = isSelectingAll || (allVisibleTransactionIds.length > 0 && 
    allVisibleTransactionIds.every(id => selectedTransactions.includes(id)));

  // Handle select all / deselect all
  const handleToggleSelectAll = async () => {
    if (allSelected || isSelectingAll) {
      // Deselect all
      setSelectedTransactions([]);
      setIsSelectingAll(false);
    } else {
      // Select all matching transactions (not just visible ones)
      setIsSelectingAll(true);
      try {
        // Build the same query params used for fetching transactions
        const params = new URLSearchParams();
        
        // Date filters
        if (dateRange && dateRange[0] && dateRange[1]) {
          params.append('start_date', dayjs(dateRange[0]).format('YYYY-MM-DD'));
          params.append('end_date', dayjs(dateRange[1]).format('YYYY-MM-DD'));
        } else if (dateFilterType === 'thisMonth') {
          const now = dayjs();
          params.append('start_date', now.startOf('month').format('YYYY-MM-DD'));
          params.append('end_date', now.endOf('month').format('YYYY-MM-DD'));
        } else if (dateFilterType === 'lastMonth') {
          const lastMonth = dayjs().subtract(1, 'month');
          params.append('start_date', lastMonth.startOf('month').format('YYYY-MM-DD'));
          params.append('end_date', lastMonth.endOf('month').format('YYYY-MM-DD'));
        } else if (dateFilterType === 'thisYear') {
          const now = dayjs();
          params.append('start_date', now.startOf('year').format('YYYY-MM-DD'));
          params.append('end_date', now.endOf('year').format('YYYY-MM-DD'));
        } else if (dateFilterType === 'lastYear') {
          const lastYear = dayjs().subtract(1, 'year');
          params.append('start_date', lastYear.startOf('year').format('YYYY-MM-DD'));
          params.append('end_date', lastYear.endOf('year').format('YYYY-MM-DD'));
        } else if (dateFilterType === 'allTime') {
          params.append('start_date', '2000-01-01');
          params.append('end_date', dayjs().format('YYYY-MM-DD'));
        }
        
        // Transaction types
        if (filterTransactionTypes.length > 0) {
          params.append('type', filterTransactionTypes.join(','));
        }
        
        // Wallet filter
        if (filterWallets.length > 0) {
          params.append('wallet_ids', filterWallets.join(','));
        }
        
        // Category filter
        if (filterCategories.length > 0) {
          params.append('category_ids', filterCategories.join(','));
        }
        
        // Tag filter
        if (filterTags.length > 0) {
          params.append('tag_ids', filterTags.join(','));
        }
        
        // Counterparty filter
        if (debouncedCounterparty) {
          params.append('counterparty', debouncedCounterparty);
        }
        
        // Amount filters
        if (debouncedMinAmount) {
          params.append('min_amount', debouncedMinAmount);
        }
        if (debouncedMaxAmount) {
          params.append('max_amount', debouncedMaxAmount);
        }
        
        // Search filter
        if (appliedSearchQuery) {
          params.append('search', appliedSearchQuery);
        }
        
        // Future transactions filter
        if (filterIncludeFuture) {
          params.append('include_future', 'true');
        }
        
        // Currency filter
        if (filterCurrencyType === 'base') {
          params.append('currency', walletsData?.baseCurrency || 'USD');
        } else if (filterCurrencyType === 'others') {
          if (filterSelectedCurrency && filterSelectedCurrency !== 'all') {
            params.append('currency', filterSelectedCurrency);
          } else {
            params.append('exclude_base_currency', 'true');
          }
        }

        console.log('Select All - Fetching IDs with params:', params.toString());
        const response = await authenticatedFetch(`/api/transactions/ids?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`Select All - Received ${data.count} transaction IDs`);
          setSelectedTransactions(data.ids);
        } else {
          showErrorNotification('Failed to select all transactions');
          setIsSelectingAll(false);
        }
      } catch (error) {
        console.error('Error selecting all transactions:', error);
        showErrorNotification('Failed to select all transactions');
        setIsSelectingAll(false);
      }
    }
  };

  // Get totals from API response (calculated for ALL matching transactions, not just paginated ones)
  const totals = useMemo(() => {
    // Get totals from the first page (all pages have the same totals)
    const apiTotals = transactionsData?.pages?.[0]?.totals;
    
    if (apiTotals) {
      return {
        totalIncome: apiTotals.income || 0,
        totalExpense: apiTotals.expenses || 0,
        netIncome: apiTotals.net || 0,
        currency: apiTotals.currency || '€'
      };
    }
    
    // Fallback if no API totals available
    return {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      currency: '€'
    };
  }, [transactionsData]);

  // Stable base currency for TransactionFilters to prevent re-renders
  const baseCurrency = useMemo(() => totals.currency, [totals.currency]);

  return (
    <AppLayout>
      <Stack style={{ position: 'relative', height: '100%' }}>
        {/* Add Transaction Button */}
        <Group justify="flex-end">
          <Button
            color="blue.9"
            radius="sm"
            leftSection={<IconCash size={18} />}
            onMouseDown={createRipple}
            onClick={() => {
              setIdempotencyKey(uuidv4());
              setDrawerOpened(true);
            }}
            w={200}
          >
            Add new transaction
          </Button>
        </Group>

        {/* Summary Boxes */}
        <TransactionSummaryBoxes 
          totals={{
            income: totals.totalIncome,
            expenses: totals.totalExpense,
            net: totals.netIncome
          }}
          isLoading={(transactionsLoading || transactionsFetching || isTransitioning) && groupedTransactions.length === 0}
          baseCurrency={totals.currency}
        />

        {/* Filter Controls - Always rendered to prevent unmounting */}
        <Box style={{ backgroundColor: 'white', borderRadius: '8px', width: '100%', boxShadow: 'var(--mantine-shadow-sm)', overflow: 'hidden' }}>
          <Box p="xs" style={{ borderBottom: '1px solid var(--gray-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            {/* Transaction Log Label */}
            <Group gap="xs" ml="4px">
              <IconActivity size={20} color="var(--blue-9)" />
              <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                Transaction Log
              </Text>
            </Group>

            {/* Right side buttons */}
            <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <TransactionSearch 
                initialValue={appliedSearchQuery}
                onSearchApply={(query) => setAppliedSearchQuery(query)}
                onSearchClear={() => {
                  setAppliedSearchQuery('');
                }}
              />

              <TransactionDateFilter 
                dateFilterType={dateFilterType}
                dateRange={dateRange}
                onDateFilterChange={(type, range) => {
                  setDateFilterType(type);
                  setDateRange(range);
                }}
                onDateFilterClear={() => {
                  setDateFilterType('thisMonth');
                  setDateRange(null);
                }}
              />

              <TransactionFilters 
                open={isFiltersDrawerOpen}
                onOpen={openDrawer}
                onClose={closeDrawer}
                filterTransactionTypes={filterTransactionTypes}
                filterWallets={filterWallets}
                filterCategories={filterCategories}
                filterTags={filterTags}
                filterMinAmount={filterMinAmount}
                filterMaxAmount={filterMaxAmount}
                filterCounterparty={filterCounterparty}
                filterIncludeFuture={filterIncludeFuture}
                filterCurrencyType={filterCurrencyType}
                filterSelectedCurrency={filterSelectedCurrency}
                onTransactionTypesChange={setFilterTransactionTypes}
                onWalletsChange={setFilterWallets}
                onCategoriesChange={setFilterCategories}
                onTagsChange={setFilterTags}
                onMinAmountChange={setFilterMinAmount}
                onMaxAmountChange={setFilterMaxAmount}
                onCounterpartyChange={setFilterCounterparty}
                onIncludeFutureChange={setFilterIncludeFuture}
                onCurrencyTypeChange={setFilterCurrencyType}
                onSelectedCurrencyChange={setFilterSelectedCurrency}
                onClearAllFilters={handleClearAllFilters}
                walletsData={walletsData}
                referenceData={referenceData}
                baseCurrency={baseCurrency}
              />

              {/* Three Dot Menu */}
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <ActionIcon 
                    variant="subtle"
                    radius="sm"
                    color="gray.11"
                    size="lg"
                    style={{
                      color: 'var(--gray-12)'
                    }}
                  >
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={isExporting ? <Loader size={16} color="gray.6" /> : <IconDownload size={16} />}
                    onClick={handleDownloadCSV}
                    disabled={isExporting || !canExportAgain || groupedTransactions.length === 0}
                  >
                    {isExporting
                      ? 'Preparing CSV...'
                      : cooldownSeconds > 0
                      ? `Download CSV (${cooldownSeconds})`
                      : 'Download CSV'
                    }
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrash size={16} />}
                    color="red.9"
                    c="red.9"
                    disabled={groupedTransactions.length === 0}
                    onClick={() => {
                      setBulkDeleteMode(true);
                      setSelectedTransactions([]);
                    }}
                  >
                    Bulk Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          </Box>

          {/* Bulk Delete Actions Bar */}
          {bulkDeleteMode && (
            <Box 
              style={{ 
                backgroundColor: 'var(--blue-1)', 
                borderRadius: '8px', 
                padding: '12px 16px',
                border: '1px solid var(--blue-4)'
              }}
            >
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                    {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
                  </Text>
                  {selectedTransactions.length > 0 && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="blue.9"
                      c="blue.9"
                      onClick={() => {
                        setSelectedTransactions([]);
                        setIsSelectingAll(false);
                      }}
                    >
                      Clear selection
                    </Button>
                  )}
                </Group>
                <Group gap="xs">
                  <Button
                    size="sm"
                    variant="outline"
                    color="gray.9"
                    c="gray.9"
                    onClick={() => {
                      setBulkDeleteMode(false);
                      setSelectedTransactions([]);
                      setIsSelectingAll(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    color="red.9"
                    leftSection={<IconTrash size={16} />}
                    disabled={selectedTransactions.length === 0}
                    onClick={() => setBulkDeleteModalOpened(true)}
                  >
                    Delete Selected
                  </Button>
                </Group>
              </Group>
            </Box>
          )}

          {/* Table Headers */}
          <Box 
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              width: '100%', 
              boxShadow: 'var(--mantine-shadow-sm)',
              padding: '12px 16px'
            }}
          >
            <Grid align="center" gutter="xs">
              {/* Select All checkbox when bulk delete is active */}
              {bulkDeleteMode && (
                <Grid.Col span={0.15}>
                  <Checkbox
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    size="xs"
                    color="blue.9"
                    indeterminate={selectedTransactions.length > 0 && !allSelected}
                  />
                </Grid.Col>
              )}
              
              <Grid.Col span={bulkDeleteMode ? 2.95 : 3}>
                <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--gray-11)' }}>
                  Counterparty
                </Text>
              </Grid.Col>
              <Grid.Col span={bulkDeleteMode ? 2.95 : 3}>
                <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--gray-11)' }}>
                  Category / Type
                </Text>
              </Grid.Col>
              <Grid.Col span={bulkDeleteMode ? 2.95 : 3}>
                <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--gray-11)', marginLeft: '-8px' }}>
                  Wallets
                </Text>
              </Grid.Col>
              <Grid.Col span={3}>
                <Group justify="flex-end" style={{ paddingRight: '32px' }}>
                  <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--gray-11)' }}>
                    Amount
                  </Text>
                </Group>
              </Grid.Col>
            </Grid>
          </Box>

          {/* Transactions List - Conditional content inside stable container */}
          {(() => {
            const hasLoadedData = transactionsData?.pages?.length > 0;
            const hasAnyTransactionsInData = transactionsData?.pages?.some(page => page?.transactions?.length > 0);
            
            // Show loading on initial load (before any data is loaded)
            if (transactionsLoading && !hasLoadedData) {
              return (
                <Stack gap="md">
                  {/* Skeleton date group header */}
                  <Box 
                    p="xs"
                    style={{ 
                      backgroundColor: 'var(--blue-3)',
                      borderRadius: '4px'
                    }}
                  >
                    <Skeleton height={20} width="25%" />
                  </Box>
                  
                  {/* Skeleton transaction items */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Box
                      key={i}
                      p="md"
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid var(--gray-4)'
                      }}
                    >
                      <Grid align="center" gutter="xs">
                        <Grid.Col span={3}>
                          <Skeleton height={16} width="80%" />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <Skeleton height={16} width="60%" />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <Skeleton height={16} width="70%" />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <Group justify="flex-end" style={{ paddingRight: '16px' }}>
                            <Skeleton height={16} width="80%" />
                          </Group>
                        </Grid.Col>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              );
            }
            
            // If list is empty and we're fetching/transitioning, show skeleton
            if (groupedTransactions.length === 0 && (transactionsFetching || isFetchingNextPage || isTransitioning)) {
              return (
                <Stack gap="md">
                  {/* Skeleton date group header */}
                  <Box 
                    p="xs"
                    style={{ 
                      backgroundColor: 'var(--blue-3)',
                      borderRadius: '4px'
                    }}
                  >
                    <Skeleton height={20} width="20%" />
                  </Box>
                  
                  {/* Skeleton transaction items */}
                  {[1, 2, 3].map((i) => (
                    <Box
                      key={i}
                      p="md"
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid var(--gray-4)'
                      }}
                    >
                      <Grid align="center" gutter="xs">
                        <Grid.Col span={3}>
                          <Skeleton height={16} width="75%" />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <Skeleton height={16} width="55%" />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <Skeleton height={16} width="65%" />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <Group justify="flex-end" style={{ paddingRight: '16px' }}>
                            <Skeleton height={16} width="70%" />
                          </Group>
                        </Grid.Col>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              );
            }
            
            // Show brand new user empty state ONLY if:
            // - No transactions in the raw data at all
            // - No filters are active
            // - Not fetching
            // - Not transitioning
            if (!hasAnyTransactionsInData && !hasActiveFilters && hasLoadedData && !transactionsFetching && !isFetchingNextPage && !isTransitioning) {
              return (
                <Box style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Text size="lg" fw={500} style={{ color: 'var(--gray-11)' }}>
                    No transactions found
                  </Text>
                  <Text size="sm" mt="xs" style={{ color: 'var(--gray-9)' }}>
                    Create your first transaction to get started
                  </Text>
                </Box>
              );
            }
            
            return (
              <TransactionList
                groupedTransactions={groupedTransactions}
                transactionsLoading={false}
                hasActiveFilters={hasActiveFilters}
                isFetchingNextPage={isFetchingNextPage}
                loadMoreRef={loadMoreRef}
                onEdit={handleOpenEditDrawer}
                onDelete={handleOpenDeleteModal}
                baseCurrency={walletsData?.baseCurrency || 'USD'}
                bulkDeleteMode={bulkDeleteMode}
                selectedTransactions={selectedTransactions}
                onToggleTransaction={(id) => {
                  setSelectedTransactions(prev => 
                    prev.includes(id) 
                      ? prev.filter(tId => tId !== id)
                      : [...prev, id]
                  );
                }}
              />
            );
          })()}
        </Box>

        {/* Drawer */}
        <TransactionDrawer 
          opened={drawerOpened}
          onClose={handleCloseDrawer}
          editMode={editMode}
          drawerTitle={drawerTitle}
          transactionType={transactionType}
          amount={amount}
          category={category}
          walletId={walletId}
          fromWalletId={fromWalletId}
          toWalletId={toWalletId}
          date={date}
          merchant={merchant}
          counterparty={counterparty}
          description={description}
          selectedTags={selectedTags}
          customTags={customTags}
          onTransactionTypeChange={handleTransactionTypeChange}
          onAmountChange={setAmount}
          onAmountBlur={(e) => {
            // Get the raw string value from the input to avoid floating point precision loss
            const rawValue = e?.target?.value?.replace(/,/g, '').replace(/[^\d.]/g, '');
            
            // Only auto-correct if the raw value truly exceeds the limit
            if (amountOverflowWarning && amountOverflowWarning.maxAllowedString && rawValue) {
              // Get the wallet currency for validation
              let walletCurrency = walletsData?.baseCurrency || 'USD';
              if (transactionType === 'income' || transactionType === 'expense') {
                const selectedWallet = walletsData?.wallets?.find(w => w.id.toString() === walletId);
                if (selectedWallet) walletCurrency = selectedWallet.currency;
              } else if (transactionType === 'transfer' && fromWalletId) {
                const fromWallet = walletsData?.wallets?.find(w => w.id.toString() === fromWalletId);
                if (fromWallet) walletCurrency = fromWallet.currency;
              }
              
              // Check if raw value exceeds the max
              if (exceedsMaxAmount(rawValue, walletCurrency)) {
                setAmount(amountOverflowWarning.maxAllowedString);
              }
            }
          }}
          onCategoryChange={handleCategoryChange}
          onWalletIdChange={setWalletId}
          onFromWalletIdChange={handleFromWalletChange}
          onToWalletIdChange={setToWalletId}
          onDateChange={setDate}
          onMerchantChange={setMerchant}
          onCounterpartyChange={setCounterparty}
          onDescriptionChange={setDescription}
          onSelectedTagsChange={setSelectedTags}
          showTagInput={showTagInput}
          setShowTagInput={setShowTagInput}
          tagSearchValue={tagSearchValue}
          setTagSearchValue={setTagSearchValue}
          maxTagsReached={maxTagsReached}
          onAddTag={handleAddTag}
          onRemoveCustomTag={handleRemoveCustomTag}
          quickDateSelection={quickDateSelection}
          onQuickDateSelect={handleQuickDateSelect}
          isFutureDate={isFutureDate}
          walletsData={walletsData}
          walletsLoading={walletsLoading}
          referenceData={referenceData}
          referenceLoading={referenceLoading}
          filteredCategories={filteredCategories}
          suggestedTags={suggestedTags}
          availableTagsForSearch={availableTagsForSearch}
          toWalletOptions={toWalletOptions}
          amountOverflowWarning={amountOverflowWarning}
          walletBalanceWarning={walletBalanceWarning}
          fromWalletBalanceWarning={fromWalletBalanceWarning}
          maxAllowedAmount={maxAllowedAmount}
          isOverdraftBlocked={isOverdraftBlocked}
          hasChanges={hasChanges}
          isSubmitting={createTransactionMutation.isPending || updateTransactionMutation.isPending}
          onSubmit={handleTransactionSubmit}
          amountInputRef={amountInputRef}
          createRipple={createRipple}
          exchangeRateInfo={exchangeRateInfo}
          checkingExchangeRate={checkingExchangeRate}
          manualExchangeRate={manualExchangeRate}
          onManualExchangeRateChange={setManualExchangeRate}
          baseCurrency={walletsData?.baseCurrency || 'USD'}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          opened={deleteModalOpened}
          onClose={() => {
            setDeleteModalOpened(false);
            setTransactionToDelete(null);
          }}
          transaction={transactionToDelete}
          onConfirm={() => {
            if (transactionToDelete) {
              deleteTransactionMutation.mutate(transactionToDelete.id);
            }
          }}
          isDeleting={deleteTransactionMutation.isPending}
        />

        {/* Bulk Delete Confirmation Modal */}
        <Modal
          opened={bulkDeleteModalOpened}
          onClose={() => setBulkDeleteModalOpened(false)}
          title="Delete Transactions?"
          centered
          size="sm"
        >
          <Box style={{ position: 'relative' }}>
            <LoadingOverlay 
              visible={bulkDeleteMutation.isPending} 
              zIndex={1000} 
              overlayProps={{ radius: "sm", blur: 2 }}
            />
            <Stack gap="md">
              <Box>
                <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                  {selectedTransactions.length} {selectedTransactions.length === 1 ? 'transaction' : 'transactions'} selected
                </Text>
              </Box>

              <Text size="sm" c="gray.11">
                This will permanently remove {selectedTransactions.length === 1 ? 'this transaction' : 'these transactions'} and update your balances and reports.
              </Text>

              <Group justify="flex-end" gap="sm">
                <Button 
                  variant="subtle" 
                  color="gray.9"
                  c="gray.9"
                  onClick={() => setBulkDeleteModalOpened(false)}
                >
                  Cancel
                </Button>
                <Button 
                  color="red.9"
                  onClick={() => bulkDeleteMutation.mutate(selectedTransactions)}
                >
                  Delete
                </Button>
              </Group>
            </Stack>
          </Box>
        </Modal>
      </Stack>
    </AppLayout>
  );
}

export default Transactions;
