import { useParams, useNavigate } from 'react-router-dom';
import { Text, Stack, Group, Button, Loader, Box, Modal, NumberInput, TextInput, Badge, Alert, SegmentedControl, Avatar, Divider, Tooltip } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconAdjustments, IconAlertTriangle, IconArchive, IconEdit, IconArrowsExchange, IconChartLine, IconWallet, IconCalculator, IconFlag, IconAdjustmentsHorizontal, IconTrendingUp, IconTrendingDown, IconArrowDownLeft, IconArrowUpRight, IconScale, IconInfoCircle, IconFileText, IconRestore } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { useWallets } from '../hooks/useWallets';
import { useReferenceData } from '../hooks/useReferenceData';
import { useRipple } from '../hooks/useRipple';
import { authenticatedFetch } from '../utils/api';
import { formatCurrency, getCurrencySymbol } from '../data/currencies';
import { WALLET_TYPES } from '../data/walletTypes';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { getCurrencyDecimals, validateCurrencyAmount, getMaxAmountDisplay, exceedsMaxAmount, getMaxAmountString, MAX_AMOUNT } from '../utils/amountValidation';
import { ArchiveWalletModal, WalletDrawer, RestoreWalletModal } from '../components/wallets';
import { TransactionDrawer } from '../components/transactions';
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
  const [quickDateSelection, setQuickDateSelection] = useState('today');
  const amountInputRef = useRef(null);

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
    setQuickDateSelection('today');
    setExchangeRateInfo(null);
    setManualExchangeRate('');
    setTransferFromWallet(wallet.id);
    setIdempotencyKey(uuidv4());
    
    // Use setTimeout to ensure state is updated before opening drawer
    setTimeout(() => {
      setTransactionDrawerOpened(true);
    }, 0);
  };

  const handleCloseTransactionDrawer = () => {
    setTransactionDrawerOpened(false);
    setTransferFromWallet(null);
    setTransactionType('transfer');
    setFromWalletId('');
    setToWalletId('');
    setAmount('');
    setTransactionDescription('');
    setSelectedTags([]);
    setCustomTags([]);
    setExchangeRateInfo(null);
    setManualExchangeRate('');
  };

  const handleTransactionSubmit = () => {
    // Format date to YYYY-MM-DD
    const dateObj = transactionDate instanceof Date ? transactionDate : new Date(transactionDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const transactionData = {
      transactionType: 'transfer',
      amount: parseFloat(amount),
      fromWalletId: fromWalletId,
      toWalletId: toWalletId,
      date: formattedDate,
      description: transactionDescription || null,
      suggestedTags: selectedTags,
      customTags: customTags
    };

    if (manualExchangeRate && parseFloat(manualExchangeRate) > 0) {
      transactionData.manualExchangeRate = parseFloat(manualExchangeRate);
    }

    createTransferMutation.mutate(transactionData);
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
            >
              Transfer Money
            </Button>
            <Button
              variant="subtle"
              color="blue.9"
              c="blue.9"
              radius="sm"
              leftSection={<IconEdit size={18} />}
              onMouseDown={createRipple}
              onClick={() => setEditDrawerOpened(true)}
            >
              Edit Wallet
            </Button>
            <Button
              variant="subtle"
              color="blue.9"
              c="blue.9"
              radius="sm"
              leftSection={<IconAdjustments size={18} />}
              onMouseDown={createRipple}
              onClick={handleOpenAdjustModal}
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
                  <Text size="sm" c="gray.9" ta="center" py="md">
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

        {/* Wallet Info & Balance History Row */}
        <Group gap="md" align="flex-start" wrap="nowrap">
          {/* Wallet Info */}
          <Box
            style={{
              backgroundColor: 'var(--gray-1)',
              borderRadius: '8px',
              border: '1px solid var(--gray-3)',
              width: '33%',
              boxShadow: 'var(--mantine-shadow-md)',
              padding: '16px',
            }}
          >
            <Group gap="xs" mb="xs">
              <IconFileText size={18} color="var(--blue-9)" />
              <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                Wallet Info
              </Text>
            </Group>
            <Divider mb="md" />
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

          {/* Balance History Chart */}
          {wallet.balance_history && wallet.balance_history.filter(item => item.balance !== null).length > 1 && (
            <Box
              style={{
                width: '66%',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid var(--gray-3)',
                padding: '16px',
                boxShadow: 'var(--mantine-shadow-md)'
              }}
            >
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
          
          {wallet.balance_history && wallet.balance_history.filter(item => item.balance !== null).length <= 1 && (
            <Box
              style={{
                width: '66%',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid var(--gray-3)',
                padding: '16px',
                textAlign: 'center',
                boxShadow: 'var(--mantine-shadow-md)'
              }}
            >
              <Group gap={8} justify="center" mb="sm">
                <IconChartLine size={32} color="var(--gray-5)" />
              </Group>
              <Text size="sm" c="gray.7" fw={500}>
                Balance history will appear after your first full day
              </Text>
            </Box>
          )}
        </Group>
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

      {/* Transaction Drawer for Transfers */}
      <TransactionDrawer
        opened={transactionDrawerOpened}
        onClose={handleCloseTransactionDrawer}
        editMode={false}
        drawerTitle={
          <Group gap="xs">
            <IconArrowsExchange size={20} color="var(--blue-9)" />
            <Text>Transfer Money</Text>
          </Group>
        }
        transactionType={transactionType}
        amount={amount}
        category=""
        walletId=""
        fromWalletId={fromWalletId}
        toWalletId={toWalletId}
        date={transactionDate}
        merchant=""
        counterparty=""
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
        onCategoryChange={() => {}}
        onWalletIdChange={() => {}}
        onFromWalletIdChange={setFromWalletId}
        onToWalletIdChange={setToWalletId}
        onDateChange={setTransactionDate}
        onMerchantChange={() => {}}
        onCounterpartyChange={() => {}}
        onDescriptionChange={setTransactionDescription}
        onSelectedTagsChange={setSelectedTags}
        showTagInput={showTagInput}
        setShowTagInput={setShowTagInput}
        tagSearchValue={tagSearchValue}
        setTagSearchValue={setTagSearchValue}
        maxTagsReached={selectedTags.length + customTags.length >= 5}
        onAddTag={(tagName) => {
          const newTag = { id: `custom_${Date.now()}`, name: tagName, is_custom: true };
          setCustomTags([...customTags, newTag]);
        }}
        onRemoveCustomTag={(tagId) => {
          setCustomTags(customTags.filter(t => t.id !== tagId));
        }}
        quickDateSelection={quickDateSelection}
        onQuickDateSelect={(value) => {
          setQuickDateSelection(value);
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
        filteredCategories={[]}
        suggestedTags={referenceData?.tags?.filter(tag => !selectedTags.includes(tag.id)) || []}
        availableTagsForSearch={referenceData?.tags?.filter(tag => 
          !selectedTags.includes(tag.id) && 
          tag.name.toLowerCase().includes(tagSearchValue.toLowerCase())
        ) || []}
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
        isSubmitting={createTransferMutation.isPending}
        amountInputRef={amountInputRef}
        maxAllowedAmount={maxAllowedAmount}
        amountOverflowWarning={amountOverflowWarning}
        fromWalletDisabled={true}
      />
    </AppLayout>
  );
}

export default WalletDetails;
