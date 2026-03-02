import { useParams, useNavigate } from 'react-router-dom';
import { Text, Stack, Group, Button, Loader, Box, Modal, NumberInput, TextInput, Badge, Alert, SegmentedControl, Avatar, Divider, Tooltip, Grid } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconAdjustments, IconAlertTriangle, IconArchive, IconEdit, IconArrowsExchange, IconChartLine, IconWallet, IconCalculator, IconFlag, IconAdjustmentsHorizontal, IconTrendingUp, IconTrendingDown, IconArrowDownLeft, IconArrowUpRight, IconScale, IconInfoCircle, IconFileText, IconRestore, IconActivity, IconLock } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { useWallets } from '../hooks/useWallets';
import { useReferenceData } from '../hooks/useReferenceData';
import { useRipple } from '../hooks/useRipple';
import { authenticatedFetch } from '../utils/api';
import { formatCurrency, getCurrencySymbol } from '../data/currencies';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { getCurrencyDecimals, validateCurrencyAmount, getMaxAmountDisplay, exceedsMaxAmount, getMaxAmountString, MAX_AMOUNT } from '../utils/amountValidation';
import { ArchiveWalletModal, WalletDrawer, RestoreWalletModal } from '../components/wallets';
import { TransactionDrawer, TransactionList, TransactionSearch, TransactionDateFilter, TransactionFilters, DeleteConfirmationModal } from '../components/transactions';
import { useTransactions } from '../hooks/useTransactions';
import { v4 as uuidv4 } from 'uuid';
import '../styles/inputs.css';

// Helper function to abbreviate large currency values for Y-axis
const formatAbbreviatedCurrency = (value, currency) => {
  const symbol = getCurrencySymbol(currency);
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000) {
    return `${symbol}${(value / 1000000000).toFixed(1)}B`;
  } else if (absValue >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `${symbol}${(value / 1000).toFixed(1)}K`;
  } else {
    return `${symbol}${value.toFixed(0)}`;
  }
};

function WalletDetails() {
  const { walletId } = useParams();
  const navigate = useNavigate();
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  const { data: walletsData } = useWallets();
  const { data: referenceData } = useReferenceData();
  
  // Fetch single wallet (includes archived wallets)
  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet', walletId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/wallets/${walletId}`);
      if (!response.ok) {
        throw new Error('Wallet not found');
      }
      return response.json();
    },
    enabled: !!walletId
  });
  
  // Transaction list filter state (must be declared before useTransactions hook)
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [dateFilterType, setDateFilterType] = useState('thisMonth');
  const [dateRange, setDateRange] = useState(null);
  const [filterTransactionTypes, setFilterTransactionTypes] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterCounterparty, setFilterCounterparty] = useState('');
  const [filterIncludeFuture, setFilterIncludeFuture] = useState(false);
  const [filterCurrencyType, setFilterCurrencyType] = useState('all');
  const [filterSelectedCurrency, setFilterSelectedCurrency] = useState('');
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  const loadMoreRef = useRef(null);
  
  // Calculate actual date range based on filter type
  const actualDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilterType) {
      case 'thisMonth': {
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return [firstDayThisMonth, lastDayThisMonth];
      }
      case 'allTime': {
        const startOfTime = new Date(2000, 0, 1); // January 1, 2000
        return [startOfTime, new Date(today)];
      }
      case 'custom':
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

  // Build transaction filters for this wallet
  const transactionFilters = useMemo(() => {
    const filters = {
      wallet_ids: walletId, // Filter for this specific wallet only
      include_future: filterIncludeFuture ? 'true' : 'false',
      include_archived_wallet_transactions: 'true' // ONLY for wallet details view
    };
    
    // Date range
    if (actualDateRange && actualDateRange[0] && actualDateRange[1]) {
      const formatDate = (date) => {
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
    if (filterTransactionTypes.length > 0) {
      filters.type = filterTransactionTypes.join(',');
    }
    
    // Categories (comma-separated UUIDs for multi-select)
    if (filterCategories.length > 0) {
      filters.category_ids = filterCategories.join(',');
    }
    
    // Tags (comma-separated UUIDs)
    if (filterTags.length > 0) {
      filters.tag_ids = filterTags.join(',');
    }
    
    // Amount range
    if (filterMinAmount) {
      filters.min_amount = filterMinAmount;
    }
    if (filterMaxAmount) {
      filters.max_amount = filterMaxAmount;
    }
    
    // Search query
    if (appliedSearchQuery.trim()) {
      filters.search = appliedSearchQuery.trim();
    } else if (filterCounterparty.trim()) {
      filters.search = filterCounterparty.trim();
    }
    
    // Currency filter
    if (filterCurrencyType === 'base') {
      filters.currency = walletsData?.baseCurrency || 'USD';
    } else if (filterCurrencyType === 'others') {
      if (filterSelectedCurrency && filterSelectedCurrency !== 'all') {
        filters.currency = filterSelectedCurrency;
      } else {
        filters.exclude_base_currency = 'true';
      }
    }
    
    return filters;
  }, [
    actualDateRange,
    walletId,
    filterTransactionTypes,
    filterCategories,
    filterTags,
    filterMinAmount,
    filterMaxAmount,
    appliedSearchQuery,
    filterCounterparty,
    filterIncludeFuture,
    filterCurrencyType,
    filterSelectedCurrency,
    walletsData
  ]);
  
  // Fetch transactions for this specific wallet
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isFetchingNextPage
  } = useTransactions(transactionFilters);
  
  // Process and group transactions by date
  const groupedTransactions = useMemo(() => {
    if (!transactionsData?.pages) return [];

    const groups = {};
    const today = new Date();
    const allTransactions = transactionsData.pages.flatMap(page => page.transactions || []);

    allTransactions.forEach(transaction => {
      const transactionDateStr = transaction.date.split('T')[0];
      const [year, month, day] = transactionDateStr.split('-').map(Number);
      const transactionDate = new Date(year, month - 1, day);

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
          currency: walletsData?.baseCurrency || 'USD'
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

    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [transactionsData, walletsData]);
  
  // Adjust balance modal state
  const [adjustModalOpened, setAdjustModalOpened] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(new Date());
  const [reason, setReason] = useState('');
  
  // Archive modal state
  const [archiveModalOpened, setArchiveModalOpened] = useState(false);

  // Restore modal state
  const [restoreModalOpened, setRestoreModalOpened] = useState(false);

  // Edit wallet drawer state
  const [editDrawerOpened, setEditDrawerOpened] = useState(false);
  
  // Chart view mode state
  const [chartViewMode, setChartViewMode] = useState('value');
  
  // Transaction drawer state
  const [transactionDrawerOpened, setTransactionDrawerOpened] = useState(false);
  const [transferFromWallet, setTransferFromWallet] = useState(null);
  const [transactionType, setTransactionType] = useState('transfer');
  const [amount, setAmount] = useState('');
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [transactionDescription, setTransactionDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4());
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagSearchValue, setTagSearchValue] = useState('');
  const [exchangeRateInfo, setExchangeRateInfo] = useState(null);
  const [manualExchangeRate, setManualExchangeRate] = useState('');
  const [checkingExchangeRate, setCheckingExchangeRate] = useState(false);
  const [categoryTagsMap, setCategoryTagsMap] = useState({});
  const amountInputRef = useRef(null);
  
  // Income/Expense transaction state
  const [transactionWalletId, setTransactionWalletId] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [counterparty, setCounterparty] = useState('');
  
  // Edit/Delete transaction state
  const [editMode, setEditMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [originalValues, setOriginalValues] = useState(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [tagCategoryWarning, setTagCategoryWarning] = useState(false);

  // Check exchange rate for transfers
  const checkExchangeRate = useCallback(async (dateToCheck, currencyToCheck) => {
    if (!dateToCheck || !currencyToCheck) return;

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
        const responseData = await response.json();
        setExchangeRateInfo(responseData);

        if (responseData.exactMatch || !responseData.requiresManualInput) {
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

  // Check exchange rate when transfer wallets or date change
  useEffect(() => {
    if (!transactionDrawerOpened) return;

    const fromWallet = walletsData?.wallets?.find(w => w.id === parseInt(fromWalletId));
    const toWallet = walletsData?.wallets?.find(w => w.id === parseInt(toWalletId));

    if (fromWallet && toWallet && fromWallet.currency !== toWallet.currency) {
      checkExchangeRate(transactionDate, fromWallet.currency);
    } else {
      setExchangeRateInfo(null);
      setManualExchangeRate('');
    }
  }, [transactionDrawerOpened, transactionDate, fromWalletId, toWalletId, walletsData, checkExchangeRate]);

  // Fetch subcategories when category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!category) {
        setSubcategories([]);
        setSubcategory(null);
        return;
      }

      setLoadingSubcategories(true);
      try {
        const response = await authenticatedFetch(`/api/transactions/subcategories/${category}`);
        if (response.ok) {
          const data = await response.json();
          setSubcategories(data.subcategories || []);
        } else {
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        setSubcategories([]);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    fetchSubcategories();
  }, [category]);

  // Compute max allowed amount for transfers
  const maxAllowedAmount = useMemo(() => {
    if (!walletsData?.wallets || walletsData.totalLiquidity === undefined) return MAX_AMOUNT;

    let walletCurrency = walletsData.baseCurrency || 'USD';
    if (fromWalletId) {
      const fromWallet = walletsData.wallets.find(w => w.id.toString() === fromWalletId);
      if (fromWallet) {
        walletCurrency = fromWallet.currency;
      }
    }

    return parseFloat(getMaxAmountString(walletCurrency));
  }, [fromWalletId, walletsData]);

  // Compute amount overflow warning
  const amountOverflowWarning = useMemo(() => {
    if (!amount || !walletsData?.wallets || walletsData.totalLiquidity === undefined) return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    let walletCurrency = walletsData.baseCurrency || 'USD';
    if (fromWalletId) {
      const fromWallet = walletsData.wallets.find(w => w.id.toString() === fromWalletId);
      if (fromWallet) {
        walletCurrency = fromWallet.currency;
      }
    }

    if (exceedsMaxAmount(amount, walletCurrency)) {
      return {
        type: 'amount_overflow',
        maxAllowedString: getMaxAmountString(walletCurrency),
        maxAllowedDisplay: getMaxAmountDisplay(walletCurrency),
        currency: walletCurrency,
        message: `Maximum transaction amount for ${walletCurrency} is ${getMaxAmountDisplay(walletCurrency)}`
      };
    }

    return null;
  }, [amount, fromWalletId, walletsData]);

  // Filter categories based on transaction type
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
  }, [referenceData?.categories, transactionType]);

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

  // Derive quick date selection from transactionDate
  const quickDateSelection = useMemo(() => {
    if (!transactionDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(transactionDate);
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
  }, [transactionDate]);

  // Handle category change and adjust tags (for edit mode)
  const handleCategoryChange = (newCategory) => {
    if (category) {
      // Save current tags for the old category
      setCategoryTagsMap(prev => ({
        ...prev,
        [category]: {
          selectedTags,
          customTags
        }
      }));
    }
  
    // Get allowed system tag IDs for the new category
    const allowedTagIds = referenceData?.categoryTagSuggestions
      .filter(cts => cts.category_id?.toString() === (newCategory ?? '').toString())
      .map(cts => cts.tag_id) || [];
  
    // Filter current selected tags: keep only system tags allowed in new category + all custom tags
    const filteredSelectedTags = selectedTags.filter(tagId => allowedTagIds.includes(tagId));
    const filteredCustomTags = customTags.filter(tag => {
      const fullTag = referenceData.tags?.find(t => t.id === tag.id);
      const isSystem = fullTag?.is_system;
      return !isSystem || allowedTagIds.includes(tag.id);
    });
  
    // Restore any previously saved tags for this new category that are not already selected
    const restored = categoryTagsMap[newCategory] || { selectedTags: [], customTags: [] };
  
    const mergedSelectedTags = Array.from(new Set([...filteredSelectedTags, ...restored.selectedTags]));
    const mergedCustomTags = Array.from(new Set([...filteredCustomTags, ...restored.customTags]));
  
    setCategory(newCategory);
    setSubcategory(null);
    setSelectedTags(mergedSelectedTags);
    setCustomTags(mergedCustomTags);
  
    // Show warning if any system tag is not allowed in the new category
    const hasSystemMismatch =
      mergedSelectedTags.some(tagId => !allowedTagIds.includes(tagId)) ||
      mergedCustomTags.some(tag => {
        const fullTag = referenceData.tags?.find(t => t.id === tag.id);
        return fullTag?.is_system && !allowedTagIds.includes(tag.id);
      });
  
    setTagCategoryWarning(hasSystemMismatch);
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

    const currentDateString = formatDateForComparison(transactionDate);
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
        normalize(transactionDescription) !== normalize(originalValues.description)
      );
    } else {
      return (
        normalize(amount) !== normalize(originalValues.amount) ||
        normalize(category) !== normalize(originalValues.category || '') ||
        normalize(subcategory) !== normalize(originalValues.subcategory || '') ||
        normalize(transactionWalletId) !== normalize(originalValues.walletId || '') ||
        currentDateString !== originalDateString ||
        normalize(merchant) !== normalize(originalValues.merchant || '') ||
        normalize(counterparty) !== normalize(originalValues.counterparty || '') ||
        normalize(transactionDescription) !== normalize(originalValues.description) ||
        currentTagsString !== (originalValues.tags || '')
      );
    }
  }, [editMode, originalValues, amount, category, subcategory, transactionWalletId, fromWalletId, toWalletId, transactionDate, merchant, counterparty, transactionDescription, selectedTags, customTags, transactionType]);
  
  // Adjust balance mutation
  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ target_balance, description, date }) => {
      const response = await authenticatedFetch(`/api/wallets/${walletId}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ 
          target_balance: parseFloat(target_balance),
          description,
          date: date.toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to adjust balance');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Show success notification
      showSuccessNotification('Balance updated successfully');
      
      // Close modal and reset form
      handleCloseAdjustModal();
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });
  
  const handleOpenAdjustModal = () => {
    setNewBalance(wallet.current_balance.toString());
    setAdjustmentDate(new Date());
    setReason('');
    setAdjustModalOpened(true);
  };
  
  const handleCloseAdjustModal = () => {
    setAdjustModalOpened(false);
    setNewBalance('');
    setReason('');
  };
  
  // Archive wallet mutation
  const archiveWalletMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedFetch(`/api/wallets/${walletId}/archive`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive wallet');
      }

      return response.json();
    },
    onSuccess: () => {
      showSuccessNotification('Wallet archived successfully');
      setArchiveModalOpened(false);
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

  const handleConfirmArchive = () => {
    archiveWalletMutation.mutate();
  };

  // Create transfer transaction mutation
  const createTransferMutation = useMutation({
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
        throw new Error(error.error || 'Failed to create transfer');
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate queries first to refresh data
      await queryClient.invalidateQueries({ queryKey: ['wallets'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Then show notification and close drawer
      showSuccessNotification('Transfer created successfully');
      handleCloseTransactionDrawer();
    },
    onError: (error) => {
      showErrorNotification(error.message);
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
        throw new Error(error.error || 'Failed to update transaction');
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate queries first to refresh data
      await queryClient.invalidateQueries({ queryKey: ['wallets'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Then show notification and close drawer
      showSuccessNotification('Transaction updated successfully');
      handleCloseTransactionDrawer();
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId) => {
      const response = await authenticatedFetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
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
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      showSuccessNotification('Transaction deleted successfully');
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

  // Transfer from wallet handler
  const handleTransferFromWallet = () => {
    if (!wallet) return;

    // Set transfer-specific state BEFORE opening drawer
    setTransactionType('transfer');
    setFromWalletId(wallet.id.toString());
    setToWalletId('');
    setAmount('');
    setTransactionDescription('');
    setTransactionDate(new Date());
    setSelectedTags([]);
    setCustomTags([]);
    setExchangeRateInfo(null);
    setManualExchangeRate('');
    setTransferFromWallet(wallet.id);
    setEditMode(false);
    setEditingTransaction(null);
    setIdempotencyKey(uuidv4());
    
    // Use setTimeout to ensure state is updated before opening drawer
    setTimeout(() => {
      setTransactionDrawerOpened(true);
    }, 0);
  };
  
  // Edit transaction handler
  const handleOpenEditDrawer = useCallback((transaction) => {
    setEditMode(true);
    setEditingTransaction(transaction);

    // Pre-fill form with transaction data
    setAmount(Math.abs(transaction.amount).toString());
    setTransactionType(transaction.type);
    setTransactionDate(new Date(transaction.date));
    setTransactionDescription(transaction.description || '');

    if (transaction.type === 'transfer') {
      // For transfers, set from/to wallets
      if (transaction.amount < 0) {
        // This is the "from" wallet (negative amount)
        setFromWalletId(transaction.wallet_id?.toString());
        setToWalletId(transaction.to_wallet_id?.toString());
      } else {
        // This is the "to" wallet (positive amount)
        setFromWalletId(transaction.to_wallet_id?.toString());
        setToWalletId(transaction.wallet_id?.toString());
      }
      
      // Set manual exchange rate if it exists
      if (transaction.manual_exchange_rate) {
        setManualExchangeRate(transaction.exchange_rate_used?.toString() || '');
      } else {
        setManualExchangeRate('');
      }
      
      // Clear exchange rate info (will be recalculated if needed)
      setExchangeRateInfo(null);
      
      // Clear income/expense fields for transfers
      setTransactionWalletId('');
      setCategory('');
      setMerchant('');
      setCounterparty('');
      setSelectedTags([]);
      setCustomTags([]);
    } else {
      // For income/expense
      setTransactionWalletId(transaction.wallet_id?.toString());
      setCategory(transaction.category_id?.toString() || '');
      setSubcategory(transaction.subcategory_id ? transaction.subcategory_id.toString() : null);
      setMerchant(transaction.merchant || '');
      setCounterparty(transaction.counterparty || '');
      
      // Clear transfer fields for income/expense
      setFromWalletId('');
      setToWalletId('');
      
      // Clear exchange rate fields for income/expense
      setManualExchangeRate('');
      setExchangeRateInfo(null);
      
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
      } else {
        // Clear tags if none exist
        setSelectedTags([]);
        setCustomTags([]);
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
        subcategory: transaction.subcategory_id ? transaction.subcategory_id.toString() : null,
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
    setTransactionDrawerOpened(true);
  }, [referenceData]);

  // Delete transaction handler
  const handleOpenDeleteModal = useCallback((transaction) => {
    setTransactionToDelete(transaction);
    setDeleteModalOpened(true);
  }, []);
  
  // Transaction list handlers
  const handleClearAllFilters = () => {
    setFilterTransactionTypes([]);
    setFilterCategories([]);
    setFilterTags([]);
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterCounterparty('');
    setFilterIncludeFuture(false);
    setFilterCurrencyType('all');
    setFilterSelectedCurrency('');
  };
  
  const hasActiveFilters = 
    filterTransactionTypes.length > 0 ||
    filterCategories.length > 0 ||
    filterTags.length > 0 ||
    filterMinAmount !== '' ||
    filterMaxAmount !== '' ||
    filterCounterparty !== '' ||
    filterIncludeFuture ||
    filterCurrencyType !== 'all' ||
    appliedSearchQuery !== '' ||
    dateFilterType !== 'thisMonth';

  const handleCloseTransactionDrawer = () => {
    setTransactionDrawerOpened(false);
    setTransferFromWallet(null);
    setTransactionType('transfer');
    setFromWalletId('');
    setToWalletId('');
    setAmount('');
    setTransactionDescription('');
    setTransactionDate(new Date()); // Reset to today
    setSelectedTags([]);
    setCustomTags([]);
    setExchangeRateInfo(null);
    setManualExchangeRate('');
    setCheckingExchangeRate(false);
    setTransactionWalletId('');
    setCategory('');
    setSubcategory(null);
    setSubcategories([]);
    setMerchant('');
    setCounterparty('');
    setShowTagInput(false);
    setTagSearchValue('');
    setEditMode(false);
    setEditingTransaction(null);
    setOriginalValues(null);
    setTagCategoryWarning(false);
  };

  const handleTransactionSubmit = () => {
    // Format date to YYYY-MM-DD
    const dateObj = transactionDate instanceof Date ? transactionDate : new Date(transactionDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Prepare transaction data
    const transactionData = {
      amount: parseFloat(amount),
      date: formattedDate,
      description: transactionDescription || null,
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
      transactionData.walletId = transactionWalletId;
      transactionData.category = category;
      transactionData.subcategory = subcategory || null;

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
      createTransferMutation.mutate(transactionData);
    }
  };
  
  const handleConfirmAdjustment = () => {
    // Validate new balance
    if (newBalance === '' || newBalance === null || newBalance === undefined) {
      showErrorNotification('Please enter a new balance');
      return;
    }
    
    const validation = validateCurrencyAmount(newBalance.toString(), wallet.currency);
    if (!validation.valid) {
      showErrorNotification(validation.error);
      return;
    }
    
    const targetBalance = parseFloat(newBalance);
    const currentBalance = parseFloat(wallet.current_balance);
    
    if (isNaN(targetBalance)) {
      showErrorNotification('Please enter a valid balance');
      return;
    }
    
    if (targetBalance === currentBalance) {
      showErrorNotification('New balance is the same as current balance');
      return;
    }
    
    // Submit adjustment
    adjustBalanceMutation.mutate({
      target_balance: targetBalance,
      description: reason || undefined,
      date: adjustmentDate
    });
  };


  if (isLoading) {
    return (
      <AppLayout>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/wallets')}
              size="sm"
              color="gray.11"
              c="gray.11"
            >
              Back to Wallets
            </Button>
          </Group>
          
          <Box
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid var(--gray-3)',
              padding: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '400px'
            }}
          >
            <Loader size="lg" color="blue.9" />
          </Box>
        </Stack>
      </AppLayout>
    );
  }

  if (!wallet) {
    return (
      <AppLayout>
        <Stack gap="md">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/wallets')}
            size="sm"
            color="gray.9"
            c="gray.9"
          >
            Back to Wallets
          </Button>
          <Text size="xl" fw={600} style={{ color: 'var(--red-9)' }}>Wallet not found</Text>
        </Stack>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Stack gap="lg">
        {/* Top Row: Back button and Action buttons */}
        <Group justify="space-between" align="center">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/wallets')}
            size="sm"
            color="gray.11"
            c="gray.11"
          >
            Back to Wallets
          </Button>
          <Group gap="md">
            <Button
              color="blue.9"
              radius="sm"
              leftSection={<IconArrowsExchange size={18} />}
              onMouseDown={createRipple}
              onClick={handleTransferFromWallet}
              disabled={wallet.is_archived}
              styles={wallet.is_archived ? {
                root: {
                  color: 'var(--gray-9)',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }
              } : undefined}
            >
              Transfer Money
            </Button>
            <Button
              variant="subtle"
              color={wallet.is_archived ? "gray" : "blue.9"}
              c={wallet.is_archived ? "gray.9" : "blue.9"}
              radius="sm"
              leftSection={<IconEdit size={18} style={wallet.is_archived ? { color: 'var(--gray-9)' } : undefined} />}
              onMouseDown={wallet.is_archived ? undefined : createRipple}
              onClick={() => setEditDrawerOpened(true)}
              disabled={wallet.is_archived}
              styles={wallet.is_archived ? {
                root: {
                  color: 'var(--gray-9) !important',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }
              } : undefined}
            >
              Edit Wallet
            </Button>
            <Button
              variant="subtle"
              color={wallet.is_archived ? "gray" : "blue.9"}
              c={wallet.is_archived ? "gray.9" : "blue.9"}
              radius="sm"
              leftSection={<IconAdjustments size={18} style={wallet.is_archived ? { color: 'var(--gray-9)' } : undefined} />}
              onMouseDown={wallet.is_archived ? undefined : createRipple}
              onClick={handleOpenAdjustModal}
              disabled={wallet.is_archived}
              styles={wallet.is_archived ? {
                root: {
                  color: 'var(--gray-9) !important',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }
              } : undefined}
            >
              Adjust Balance
            </Button>
            {wallet.is_archived ? (
              <Button
                variant="subtle"
                color="blue.9"
                c="blue.9"
                radius="sm"
                leftSection={<IconRestore size={18} />}
                onMouseDown={createRipple}
                onClick={() => setRestoreModalOpened(true)}
              >
                Restore Wallet
              </Button>
            ) : (
              <Button
                variant="subtle"
                color="blue.9"
                c="blue.9"
                radius="sm"
                leftSection={<IconArchive size={18} />}
                onMouseDown={createRipple}
                onClick={() => setArchiveModalOpened(true)}
              >
                Archive Wallet
              </Button>
            )}
          </Group>
        </Group>

        {/* Wallet Overview and Balance Breakdown */}
        {wallet && (
          <Group gap="md" align="stretch" wrap="nowrap">
            {/* Wallet Overview */}
            <Box
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid var(--gray-3)',
                padding: '16px',
                boxShadow: 'var(--mantine-shadow-md)',
                flex: 1
              }}
            >
              <Group gap="xs" mb="xs">
                <IconWallet size={18} color="var(--blue-9)" />
                <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                  Wallet Overview
                </Text>
              </Group>
              <Divider mb="md" />
              <Group gap="md" align="flex-start">
                <Stack gap="md" align="center">
                  {wallet.icon && (wallet.icon.startsWith('data:image') || wallet.icon.startsWith('http')) ? (
                    <Box
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                  ) : (
                    <Avatar
                      radius="md"
                      size={56}
                      color="white"
                      style={{
                        backgroundColor: `var(--${wallet.color}-9)`
                      }}
                    >
                      <Text size="xl" fw={600}>
                        {(() => {
                          const words = wallet.name.split(' ');
                          return (words[0]?.charAt(0) || '') + (words[1]?.charAt(0) || '');
                        })()}
                      </Text>
                    </Avatar>
                  )}
                </Stack>
                <Stack gap={1} style={{ flex: 1 }}>
                  <Text size="lg" fw={600} style={{ color: 'var(--gray-12)' }}>
                    {wallet.name}
                  </Text>
                  <Group gap={4}>
                    <Tooltip
                      label="Determines how this wallet behaves, such as whether it can go negative or be used for transfers."
                      multiline
                      w={280}
                      withArrow
                    >
                      <Text size="xs" style={{ color: 'var(--gray-9)', cursor: 'help' }}>
                        {wallet.type === 'bank' && 'Bank Account'}
                        {wallet.type === 'cash' && 'Cash Wallet'}
                        {wallet.type === 'digital_wallet' && 'Digital Wallet'}
                      </Text>
                    </Tooltip>
                    <Text size="xs" style={{ color: 'var(--gray-9)' }}>
                      •
                    </Text>
                    <Tooltip
                      label="All transactions in this wallet use this currency."
                      withArrow
                    >
                      <Text size="xs" style={{ color: 'var(--gray-9)', cursor: 'help' }}>
                        {wallet.currency}
                      </Text>
                    </Tooltip>
                  </Group>
                </Stack>
              </Group>
              <Stack gap={1} mt="xl">
                <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                  Balance
                </Text>
                <Stack gap={1}>
                  <Text size="xl" fw={700} style={{ color: 'var(--gray-12)' }}>
                    {formatCurrency(wallet.current_balance, wallet.currency)}
                  </Text>
                  {wallet.currency !== walletsData?.baseCurrency && walletsData?.baseCurrency && wallet.balance_in_base_currency !== undefined && (
                    <Box style={{ display: 'inline-block' }}>
                      <Tooltip
                        label="Shown in your base currency using the most recent available exchange rate."
                        multiline
                        w={280}
                        withArrow
                      >
                        <Text size="xs" style={{ color: 'var(--gray-9)', cursor: 'help', display: 'inline' }}>
                          ≈ {formatCurrency(wallet.balance_in_base_currency, walletsData.baseCurrency)} {walletsData.baseCurrency}
                        </Text>
                      </Tooltip>
                    </Box>
                  )}
                </Stack>
              </Stack>
              <Group gap="xs" mt="sm">
                <Tooltip 
                  label={wallet.include_in_balance 
                    ? "This wallet is counted in your available balance" 
                    : "This wallet is not counted in your available balance"
                  }
                  withArrow
                >
                  <Badge
                    size="sm"
                    variant="light"
                    styles={{
                      root: {
                        color: wallet.include_in_balance ? 'var(--green-9)' : 'var(--gray-9)'
                      }
                    }}
                  >
                    {wallet.include_in_balance ? "Included" : "Excluded"}
                  </Badge>
                </Tooltip>
                {wallet.is_archived && (
                  <Tooltip
                    label="This wallet is hidden from totals and new transactions but keeps its history."
                    multiline
                    w={280}
                    withArrow
                  >
                    <Badge
                      size="sm"
                      color="orange"
                      variant="light"
                      styles={{
                        root: {
                          color: 'var(--orange-9)',
                          cursor: 'help'
                        }
                      }}
                    >
                      Archived
                    </Badge>
                  </Tooltip>
                )}
              </Group>
              
              {/* Wallet Info */}
              <Divider my="md" />
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                    Created on
                  </Text>
                  <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                    {new Date(wallet.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </Group>
                {wallet.last_activity_date && (
                  <Group justify="space-between" align="center">
                    <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                      Last activity
                    </Text>
                    <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                      {new Date(wallet.last_activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </Group>
                )}
                <Group justify="space-between" align="center">
                  <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                    Transactions
                  </Text>
                  <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                    {wallet.transaction_count || 0}
                  </Text>
                </Group>
                {wallet.is_archived && (
                  <Group justify="space-between" align="center">
                    <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                      Archived on
                    </Text>
                    <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                      {new Date(wallet.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Box>

            {/* Balance Breakdown */}
            <Box
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid var(--gray-3)',
                padding: '16px',
                boxShadow: 'var(--mantine-shadow-md)',
                flex: 1
              }}
            >
              <Group gap="xs" mb="xs">
                <IconCalculator size={18} color="var(--blue-9)" />
                <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                  Balance Breakdown
                </Text>
              </Group>
              <Divider mb="md" />
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconFlag size={16} color="var(--blue-9)" />
                  <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                    Starting Balance
                  </Text>
                </Group>
                <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                  {formatCurrency(wallet.starting_balance, wallet.currency)}
                </Text>
              </Group>
              <Box
                my="md"
                style={{
                  height: '1px',
                  background: 'var(--blue-9)'
                }}
              />
              {wallet.breakdown && (() => {
                const hasActivity = wallet.breakdown.total_income !== 0 ||
                                   wallet.breakdown.total_expenses !== 0 ||
                                   wallet.breakdown.total_transfers_in !== 0 ||
                                   wallet.breakdown.total_transfers_out !== 0 ||
                                   wallet.breakdown.total_adjustments !== 0;

                return hasActivity ? (
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <IconTrendingUp size={16} color="var(--blue-9)" />
                        <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                          Income
                        </Text>
                      </Group>
                      <Text size="sm" fw={500} style={{ color: 'var(--green-9)' }}>
                        +{formatCurrency(wallet.breakdown.total_income, wallet.currency)}
                      </Text>
                    </Group>
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <IconTrendingDown size={16} color="var(--blue-9)" />
                        <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                          Expenses
                        </Text>
                      </Group>
                      <Text size="sm" fw={500} style={{ color: 'var(--red-9)' }}>
                        -{formatCurrency(wallet.breakdown.total_expenses, wallet.currency)}
                      </Text>
                    </Group>
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <IconArrowDownLeft size={16} color="var(--blue-9)" />
                        <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                          Transfers In
                        </Text>
                      </Group>
                      <Text size="sm" fw={500} style={{ color: 'var(--green-9)' }}>
                        +{formatCurrency(wallet.breakdown.total_transfers_in, wallet.currency)}
                      </Text>
                    </Group>
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <IconArrowUpRight size={16} color="var(--blue-9)" />
                        <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                          Transfers Out
                        </Text>
                      </Group>
                      <Text size="sm" fw={500} style={{ color: 'var(--red-9)' }}>
                        -{formatCurrency(wallet.breakdown.total_transfers_out, wallet.currency)}
                      </Text>
                    </Group>
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <IconAdjustmentsHorizontal size={16} color="var(--blue-9)" />
                        <Text size="sm" style={{ color: 'var(--gray-11)' }}>
                          Balance Adjustments
                        </Text>
                        <Tooltip
                          label={
                            <div>
                              <div>Manual corrections made to align the wallet balance with reality.</div>
                              <div>Adjustments don't represent income or spending.</div>
                            </div>
                          }
                          multiline
                          w={280}
                          withArrow
                        >
                          <IconInfoCircle size={14} color="var(--blue-9)" style={{ cursor: 'help' }} />
                        </Tooltip>
                      </Group>
                      <Text size="sm" fw={500} style={{ color: wallet.breakdown.total_adjustments >= 0 ? 'var(--green-9)' : 'var(--red-9)' }}>
                        {wallet.breakdown.total_adjustments >= 0 ? '+' : ''}{formatCurrency(wallet.breakdown.total_adjustments, wallet.currency)}
                      </Text>
                    </Group>
                  </Stack>
                ) : (
                  <Text size="md" c="gray.9" ta="center" py="md">
                    No activity yet. Balance equals starting balance.
                  </Text>
                );
              })()}
              <Box
                my="md"
                style={{
                  height: '1px',
                  background: 'var(--blue-9)'
                }}
              />
              <Group justify="space-between" align="center" mt="md">
                <Group gap="xs">
                  <IconScale size={16} color="var(--blue-9)" />
                  <Text size="sm" fw={600} style={{ color: 'var(--gray-12)' }}>
                    Current Balance
                  </Text>
                </Group>
                <Text size="md" fw={700} style={{ color: 'var(--gray-12)' }}>
                  {formatCurrency(wallet.current_balance, wallet.currency)}
                </Text>
              </Group>
            </Box>
          </Group>
        )}

        {/* Recent Transactions */}
        <Box style={{ backgroundColor: 'white', borderRadius: '8px', width: '100%', boxShadow: 'var(--mantine-shadow-md)', overflow: 'hidden' }}>
          <Box p="xs" style={{ borderBottom: '1px solid var(--gray-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            {/* Recent Transactions Label */}
            <Group gap="xs" ml="4px" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
              <IconActivity size={20} color="var(--blue-9)" style={{ flexShrink: 0 }} />
              <Text size="sm" fw={500} style={{ color: 'var(--gray-12)', flexShrink: 0 }}>
                Recent Transactions
              </Text>
              <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                <Text size="sm" style={{ color: 'var(--gray-9)', flexShrink: 0 }}>
                  Showing transactions for
                </Text>
                <Tooltip label={wallet.name} withArrow disabled={wallet.name.length <= 30}>
                  <Text 
                    size="sm" 
                    c="var(--gray-12)" 
                    fw={600} 
                    style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      cursor: wallet.name.length > 30 ? 'help' : 'default'
                    }}
                  >
                    {wallet.name}
                  </Text>
                </Tooltip>
              </Group>
              <Text 
                size="sm" 
                style={{ color: 'var(--gray-12)', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
                onClick={() => {
                  // Build query params with current filters (excluding wallet filter)
                  const params = new URLSearchParams();
                  
                  // Transaction types
                  if (filterTransactionTypes.length > 0) {
                    params.set('types', filterTransactionTypes.join(','));
                  }
                  
                  // Categories
                  if (filterCategories.length > 0) {
                    params.set('categories', filterCategories.join(','));
                  }
                  
                  // Tags
                  if (filterTags.length > 0) {
                    params.set('tags', filterTags.join(','));
                  }
                  
                  // Amount range
                  if (filterMinAmount) {
                    params.set('minAmount', filterMinAmount);
                  }
                  if (filterMaxAmount) {
                    params.set('maxAmount', filterMaxAmount);
                  }
                  
                  // Search/Counterparty
                  if (appliedSearchQuery) {
                    params.set('search', appliedSearchQuery);
                  } else if (filterCounterparty) {
                    params.set('counterparty', filterCounterparty);
                  }
                  
                  // Include future
                  if (filterIncludeFuture) {
                    params.set('includeFuture', 'true');
                  }
                  
                  // Date filter (don't include currency filters)
                  if (dateFilterType !== 'thisMonth') {
                    params.set('dateFilter', dateFilterType);
                    if (dateFilterType === 'custom' && dateRange) {
                      params.set('startDate', dateRange[0].toISOString());
                      params.set('endDate', dateRange[1].toISOString());
                    }
                  }
                  
                  const queryString = params.toString();
                  navigate(`/transactions${queryString ? `?${queryString}` : ''}`);
                }}
              >
                View all transactions
              </Text>
            </Group>

            {/* Right side buttons */}
            <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <TransactionSearch 
                initialValue={appliedSearchQuery}
                onSearchApply={(query) => setAppliedSearchQuery(query)}
                onSearchClear={() => setAppliedSearchQuery('')}
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
                onOpen={() => setIsFiltersDrawerOpen(true)}
                onClose={() => setIsFiltersDrawerOpen(false)}
                filterTransactionTypes={filterTransactionTypes}
                filterWallets={[]} // Don't show wallet filter since we're already filtering by this wallet
                filterCategories={filterCategories}
                filterTags={filterTags}
                filterMinAmount={filterMinAmount}
                filterMaxAmount={filterMaxAmount}
                filterCounterparty={filterCounterparty}
                filterIncludeFuture={filterIncludeFuture}
                filterCurrencyType={filterCurrencyType}
                filterSelectedCurrency={filterSelectedCurrency}
                onTransactionTypesChange={setFilterTransactionTypes}
                onWalletsChange={() => {}} // No-op since wallet is fixed
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
                baseCurrency={walletsData?.baseCurrency}
                hideWalletFilter={true}
              />
            </Box>
          </Box>

          {/* Archived Wallet Banner */}
          {wallet.is_archived && (
            <Alert
              color="gray.9"
              variant="light"
              styles={{
                root: {
                  backgroundColor: 'var(--gray-1)',
                  border: '1px solid var(--gray-3)',
                  color: 'var(--gray-9)'
                },
                message: {
                  color: 'var(--gray-9)'
                }
              }}
            >
              <Stack gap={2}>
                <Group gap="xs">
                  <IconLock size={18} style={{ color: 'var(--gray-9)' }} />
                  <Text size="sm" fw={600} style={{ color: 'var(--gray-9)' }}>
                    This wallet is archived
                  </Text>
                </Group>
                <Text size="sm" style={{ color: 'var(--gray-9)' }}>
                  Transactions are preserved for reference and cannot be modified
                </Text>
              </Stack>
            </Alert>
          )}

          {/* Table Headers */}
          <Box 
            style={{ 
              backgroundColor: 'white', 
              width: '100%', 
              boxShadow: 'var(--mantine-shadow-sm)',
              padding: '12px 16px'
            }}
          >
            <Grid align="center" gutter="xs">
              <Grid.Col span={4}>
                <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--gray-11)' }}>
                  Counterparty
                </Text>
              </Grid.Col>
              <Grid.Col span={4}>
                <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--gray-11)' }}>
                  Category
                </Text>
              </Grid.Col>
              <Grid.Col span={4}>
                <Group justify="flex-end" style={{ paddingRight: '16px' }}>
                  <Text size="xs" fw={600} tt="uppercase" style={{ color: 'var(--gray-11)' }}>
                    Amount
                  </Text>
                </Group>
              </Grid.Col>
            </Grid>
          </Box>

          {/* Transaction List */}
          <Box>
            <TransactionList
              groupedTransactions={groupedTransactions}
              transactionsLoading={transactionsLoading}
              hasActiveFilters={hasActiveFilters}
              isFetchingNextPage={isFetchingNextPage}
              loadMoreRef={loadMoreRef}
              onEdit={handleOpenEditDrawer}
              onDelete={handleOpenDeleteModal}
              baseCurrency={walletsData?.baseCurrency || 'USD'}
              bulkDeleteMode={false}
              selectedTransactions={[]}
              onToggleTransaction={() => {}}
              hideWalletColumn={true}
              emptyStateTitle={!wallet?.is_archived ? 'No transactions yet' : 'No transactions found'}
              emptyStateSubtitle={!wallet?.is_archived ? 'Transactions for this wallet will appear once you start using it.' : 'Create your first transaction to get started'}
              readOnly={wallet?.is_archived}
            />
          </Box>
        </Box>

        {/* Balance History Chart */}
        {wallet.balance_history && wallet.balance_history.filter(item => item.balance !== null).length > 1 && (
          <Box style={{ backgroundColor: 'white', borderRadius: '8px', width: '100%', boxShadow: 'var(--mantine-shadow-md)', overflow: 'hidden', padding: '16px' }}>
            <style>
              {`
                .recharts-wrapper, 
                .recharts-wrapper *,
                .recharts-surface,
                .recharts-wrapper svg,
                .recharts-wrapper path,
                .recharts-wrapper g,
                .recharts-wrapper line,
                .recharts-wrapper text {
                  outline: none !important;
                }
                .recharts-wrapper *:focus,
                .recharts-wrapper svg:focus,
                .recharts-surface:focus {
                  outline: none !important;
                }
              `}
            </style>
            <Group justify="space-between" align="center" mb="md">
              <Group gap={8}>
                <IconChartLine size={18} color="var(--blue-9)" />
                <Text size="sm" fw={500}>
                  <Text component="span" c="gray.11" fw={500}>Balance History </Text>
                  <Text component="span" c="gray.9" size="xs">(Last 30 Days)</Text>
                </Text>
              </Group>
              <SegmentedControl
                value={chartViewMode}
                onChange={setChartViewMode}
                data={[
                  { label: 'Value', value: 'value' },
                  { label: 'Performance', value: 'performance' }
                ]}
                size="xs"
                radius="sm"
              />
            </Group>
            <Box style={{ outline: 'none' }}>
              <ResponsiveContainer width="100%" height={400} key={`chart-${wallet.id}-${chartViewMode}`}>
                <AreaChart
                  data={(() => {
                    if (chartViewMode === 'value') {
                      return wallet.balance_history.map((item) => ({
                        date: item.date,
                        dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        balance: item.balance
                      }));
                    } else {
                      // Performance mode: calculate percentage change from baseline
                      const baseline = wallet.balance_history.find(item => item.balance !== null)?.balance || 0;
                      return wallet.balance_history.map((item) => {
                        if (item.balance === null) {
                          return {
                            date: item.date,
                            dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            performance: null
                          };
                        }
                        const performancePercent = baseline !== 0 ? ((item.balance - baseline) / baseline) * 100 : 0;
                        return {
                          date: item.date,
                          dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          performance: performancePercent
                        };
                      });
                    }
                  })()}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`var(--${wallet.color}-9)`} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={`var(--${wallet.color}-9)`} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="positivePerformanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--green-9)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--green-9)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="negativePerformanceGradient" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="var(--red-9)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--red-9)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="" 
                  stroke="var(--gray-3)" 
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 11, fill: 'var(--gray-12)' }}
                  tickLine={{ stroke: 'var(--gray-12)' }}
                  axisLine={{ stroke: 'var(--gray-12)' }}
                  height={50}
                  interval={1}
                />
                {chartViewMode === 'value' ? (
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'var(--gray-12)' }}
                    tickLine={{ stroke: 'var(--gray-12)' }}
                    axisLine={{ stroke: 'var(--gray-12)' }}
                    tickFormatter={(value) => formatAbbreviatedCurrency(value, wallet.currency)}
                    tickCount={5}
                  />
                ) : (
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'var(--gray-11)' }}
                    tickLine={{ stroke: 'var(--gray-11)' }}
                    axisLine={{ stroke: 'var(--gray-11)' }}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    tickCount={5}
                    domain={(() => {
                      const baseline = wallet.balance_history.find(item => item.balance !== null)?.balance || 0;
                      const performanceValues = wallet.balance_history
                        .filter(item => item.balance !== null)
                        .map(item => baseline !== 0 ? ((item.balance - baseline) / baseline) * 100 : 0);
                      
                      const minPerf = Math.min(...performanceValues, 0);
                      const maxPerf = Math.max(...performanceValues, 0);
                      
                      // Calculate the larger absolute value to ensure 0% is centered
                      const maxAbsolute = Math.max(Math.abs(minPerf), Math.abs(maxPerf));
                      
                      // Ensure minimum range of ±1%
                      const paddedRange = Math.max(maxAbsolute, 1);
                      
                      return [-paddedRange, paddedRange];
                    })()}
                  />
                )}
                {chartViewMode === 'value' ? (
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--gray-3)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [formatCurrency(value, wallet.currency), 'Balance']}
                    labelFormatter={(label) => label}
                  />
                ) : (
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--gray-3)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'Performance']}
                    labelFormatter={(label) => label}
                  />
                )}
                {chartViewMode === 'performance' && (
                  <ReferenceLine y={0} stroke="var(--gray-7)" strokeWidth={2} strokeDasharray="3 3" />
                )}
                {chartViewMode === 'value' ? (
                  <Area
                    type="linear"
                    dataKey="balance"
                    stroke={`var(--${wallet.color}-9)`}
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: `var(--${wallet.color}-9)` }}
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                ) : (
                  <Area
                    type="linear"
                    dataKey="performance"
                    stroke={(() => {
                      const lastValidPerformance = wallet.balance_history
                        .filter(item => item.balance !== null)
                        .map(item => {
                          const baseline = wallet.balance_history.find(i => i.balance !== null)?.balance || 0;
                          return baseline !== 0 ? ((item.balance - baseline) / baseline) * 100 : 0;
                        })
                        .pop();
                      return lastValidPerformance >= 0 ? 'var(--green-9)' : 'var(--red-9)';
                    })()}
                    strokeWidth={2}
                    fill={(() => {
                      const lastValidPerformance = wallet.balance_history
                        .filter(item => item.balance !== null)
                        .map(item => {
                          const baseline = wallet.balance_history.find(i => i.balance !== null)?.balance || 0;
                          return baseline !== 0 ? ((item.balance - baseline) / baseline) * 100 : 0;
                        })
                        .pop();
                      return lastValidPerformance >= 0 ? 'url(#positivePerformanceGradient)' : 'url(#negativePerformanceGradient)';
                    })()}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: (() => {
                        const lastValidPerformance = wallet.balance_history
                          .filter(item => item.balance !== null)
                          .map(item => {
                            const baseline = wallet.balance_history.find(i => i.balance !== null)?.balance || 0;
                            return baseline !== 0 ? ((item.balance - baseline) / baseline) * 100 : 0;
                          })
                          .pop();
                        return lastValidPerformance >= 0 ? 'var(--green-9)' : 'var(--red-9)';
                      })()
                    }}
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
            </Box>
          </Box>
          )}

        {/* Empty state for Balance History */}
        {wallet.balance_history && wallet.balance_history.filter(item => item.balance !== null).length <= 1 && (
          <Box style={{ backgroundColor: 'white', borderRadius: '8px', width: '100%', boxShadow: 'var(--mantine-shadow-md)', overflow: 'hidden', padding: '16px', textAlign: 'center' }}>
            <Group gap={8} justify="center" mb="sm">
              <IconChartLine size={32} color="var(--gray-11)" />
            </Group>
            <Text size="sm" c="gray.9">
              Balance history will appear after your first full day
            </Text>
          </Box>
        )}
      </Stack>
      
      {/* Adjust Balance Modal */}
      <Modal
        opened={adjustModalOpened}
        onClose={handleCloseAdjustModal}
        title={
          <Group gap="xs">
            <IconAdjustments size={20} color="var(--blue-9)" />
            <Text>Correct wallet balance</Text>
          </Group>
        }
        size="md"
        centered
      >
        <Stack 
          gap="md"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              if (!adjustBalanceMutation.isPending) {
                handleConfirmAdjustment();
              }
            }
          }}
        >
          {/* Subtitle */}
          <Text size="sm" style={{ color: 'var(--gray-12)' }}>
            Use this if the wallet balance is incorrect. This will not affect income or expenses.
          </Text>
          
          {/* Current Balance (Read-only) */}
          <Box>
            <Text size="sm" fw={500} mb={4} style={{ color: 'var(--gray-12)' }}>
              Current Balance
            </Text>
            <TextInput
              value={formatCurrency(wallet.current_balance, wallet.currency)}
              readOnly
              styles={{
                input: {
                  backgroundColor: 'var(--gray-1)',
                  color: 'var(--gray-11)',
                  cursor: 'not-allowed'
                }
              }}
            />
          </Box>
          
          {/* New Balance */}
          <NumberInput
            label="New Balance"
            placeholder="0.00"
            value={newBalance}
            onChange={(value) => setNewBalance(value)}
            onBlur={(e) => {
              // Get the raw string value from the input to avoid floating point precision loss
              const rawValue = e.target.value?.replace(/,/g, '').replace(/[^\d.]/g, '');
              
              // Auto-correct to max if exceeded (check raw string value)
              if (rawValue && exceedsMaxAmount(rawValue, wallet.currency)) {
                setNewBalance(getMaxAmountString(wallet.currency));
              }
            }}
            thousandSeparator=","
            decimalScale={getCurrencyDecimals(wallet.currency)}
            fixedDecimalScale={getCurrencyDecimals(wallet.currency) > 0}
            prefix={getCurrencySymbol(wallet.currency) + ' '}
            required
            min={0}
            error={newBalance && exceedsMaxAmount(newBalance, wallet.currency) ? `Maximum allowed: ${getMaxAmountDisplay(wallet.currency)}` : null}
          />
          
          {/* Date */}
          <DateInput
            label="Date"
            value={adjustmentDate}
            onChange={setAdjustmentDate}
            maxDate={new Date()}
            minDate={new Date(wallet.created_at)}
            required
            valueFormat="DD/MM/YYYY"
          />
          
          {/* Reason (Optional) */}
          <TextInput
            label={
              <Group gap={8}>
                <Text size="sm" fw={500}>Reason</Text>
                <Badge size="xs" variant="light" color="blue.9" c="blue.9">
                  Recommended
                </Badge>
              </Group>
            }
            placeholder="e.g. Forgot to record cash transactions"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={80}
            className="text-input"
          />
          
          {/* Warning Banner */}
          <Alert 
            color="orange"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
          >
            This creates a system adjustment transaction. It will update the wallet balance but will not count as income or expense.
          </Alert>
          
          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              color="blue"
              style={{ color: 'var(--blue-9)' }}
              onClick={handleCloseAdjustModal}
              disabled={adjustBalanceMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              color="blue"
              style={{ backgroundColor: 'var(--blue-9)' }}
              loading={adjustBalanceMutation.isPending}
              onClick={handleConfirmAdjustment}
            >
              Confirm Adjustment
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Wallet Drawer */}
      <WalletDrawer
        opened={editDrawerOpened}
        onClose={() => setEditDrawerOpened(false)}
        selectedWallet={wallet}
        onArchiveWallet={() => {
          setEditDrawerOpened(false);
          setArchiveModalOpened(true);
        }}
        baseCurrency={walletsData?.baseCurrency}
      />

      {/* Archive Wallet Modal */}
      <ArchiveWalletModal
        opened={archiveModalOpened}
        onClose={() => setArchiveModalOpened(false)}
        wallet={wallet}
        onConfirm={handleConfirmArchive}
        isLoading={archiveWalletMutation.isPending}
      />

      {/* Restore Wallet Modal */}
      <RestoreWalletModal
        opened={restoreModalOpened}
        onClose={() => setRestoreModalOpened(false)}
        wallet={wallet}
      />

      {/* Transaction Drawer for Transfers and Edit */}
      <TransactionDrawer
        opened={transactionDrawerOpened}
        onClose={handleCloseTransactionDrawer}
        editMode={editMode}
        editingTransaction={editingTransaction}
        drawerTitle={
          editMode ? (
            <Group gap="xs">
              <IconEdit size={20} color="var(--blue-9)" />
              <Text>
                {transactionType === 'expense'
                  ? 'Edit Expense'
                  : transactionType === 'income'
                  ? 'Edit Income'
                  : 'Edit Transfer'}
              </Text>
            </Group>
          ) : (
            <Group gap="xs">
              <IconArrowsExchange size={20} color="var(--blue-9)" />
              <Text>Transfer Money</Text>
            </Group>
          )
        }
        transactionType={transactionType}
        amount={amount}
        category={category}
        subcategory={subcategory}
        subcategories={subcategories}
        loadingSubcategories={loadingSubcategories}
        onSubcategoryChange={setSubcategory}
        walletId={transactionWalletId}
        fromWalletId={fromWalletId}
        toWalletId={toWalletId}
        date={transactionDate}
        merchant={merchant}
        counterparty={counterparty}
        description={transactionDescription}
        selectedTags={selectedTags}
        customTags={customTags}
        transferFromWallet={transferFromWallet}
        onTransactionTypeChange={setTransactionType}
        onAmountChange={setAmount}
        onAmountBlur={(e) => {
          const rawValue = e?.target?.value?.replace(/,/g, '').replace(/[^\d.]/g, '');
          
          if (rawValue && fromWalletId) {
            const fromWallet = walletsData?.wallets?.find(w => w.id.toString() === fromWalletId);
            if (fromWallet && exceedsMaxAmount(rawValue, fromWallet.currency)) {
              const maxString = getMaxAmountString(fromWallet.currency);
              setAmount(maxString);
            }
          }
        }}
        onCategoryChange={handleCategoryChange}
        onWalletIdChange={setTransactionWalletId}
        onFromWalletIdChange={setFromWalletId}
        onToWalletIdChange={setToWalletId}
        onDateChange={setTransactionDate}
        onMerchantChange={setMerchant}
        onCounterpartyChange={setCounterparty}
        onDescriptionChange={setTransactionDescription}
        onSelectedTagsChange={setSelectedTags}
        showTagInput={showTagInput}
        setShowTagInput={setShowTagInput}
        tagSearchValue={tagSearchValue}
        setTagSearchValue={setTagSearchValue}
        maxTagsReached={maxTagsReached}
        onAddTag={(tagName) => {
          const newTag = { id: `custom_${Date.now()}`, name: tagName, is_custom: true };
          setCustomTags([...customTags, newTag]);
        }}
        onRemoveCustomTag={(tagId) => {
          setCustomTags(customTags.filter(t => t.id !== tagId));
        }}
        quickDateSelection={quickDateSelection}
        onQuickDateSelect={(value) => {
          if (value === 'today') {
            setTransactionDate(new Date());
          } else if (value === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            setTransactionDate(yesterday);
          } else if (value === '2days') {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            setTransactionDate(twoDaysAgo);
          }
        }}
        isFutureDate={transactionDate > new Date()}
        walletsData={walletsData}
        walletsLoading={isLoading}
        referenceData={referenceData}
        filteredCategories={filteredCategories}
        suggestedTags={suggestedTags}
        availableTagsForSearch={availableTagsForSearch}
        toWalletOptions={walletsData?.wallets?.filter(w => w.id.toString() !== fromWalletId).map(w => ({
          value: w.id.toString(),
          label: `${w.name} (${w.currency})`,
          wallet: w
        })) || []}
        exchangeRateInfo={exchangeRateInfo}
        manualExchangeRate={manualExchangeRate}
        onManualExchangeRateChange={setManualExchangeRate}
        checkingExchangeRate={checkingExchangeRate}
        onSubmit={handleTransactionSubmit}
        isSubmitting={createTransferMutation.isPending || updateTransactionMutation.isPending}
        amountInputRef={amountInputRef}
        createRipple={createRipple}
        maxAllowedAmount={maxAllowedAmount}
        amountOverflowWarning={amountOverflowWarning}
        isOverdraftBlocked={false}
        hasChanges={hasChanges}
        tagCategoryWarning={tagCategoryWarning}
        fromWalletDisabled={
          editMode && transactionType === 'transfer' 
            ? fromWalletId === walletId 
            : true // For new transfers, always disable from wallet (locked to current wallet)
        }
        toWalletDisabled={
          editMode && transactionType === 'transfer'
            ? toWalletId === walletId
            : false // For new transfers, to wallet is enabled
        }
        walletDisabled={editMode && transactionType !== 'transfer'}
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
    </AppLayout>
  );
}

export default WalletDetails;
