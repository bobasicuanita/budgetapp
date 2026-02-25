import AppLayout from '../components/AppLayout';
import { Text, Stack, Group, Loader, Accordion, Box, Avatar, ActionIcon, Button, Menu, Badge, Tooltip, Divider } from '@mantine/core';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Sector, Legend } from 'recharts';
import { authenticatedFetch } from '../utils/api';
import { WALLET_TYPES } from '../data/walletTypes';
import { formatCurrency } from '../data/currencies';
import { IconEdit, IconDotsVertical, IconArrowsExchange, IconReceipt, IconCoins, IconShoppingCart, IconPigMoney, IconWallet } from '@tabler/icons-react';
import { useRipple } from '../hooks/useRipple';
import { useWallets } from '../hooks/useWallets';
import { useReferenceData } from '../hooks/useReferenceData';
import { getMaxAmountDisplay, exceedsMaxAmount, getMaxAmountString, MAX_AMOUNT } from '../utils/amountValidation';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { ArchivedWalletsManager, ArchiveWalletModal, WalletDrawer } from '../components/wallets';
import { TransactionDrawer } from '../components/transactions';
import { v4 as uuidv4 } from 'uuid';
import '../styles/navigation.css';
import '../styles/inputs.css';

// Wallet type colors for pie chart
const WALLET_TYPE_COLORS = {
  cash: '#10b981',      // Green
  bank: '#3b82f6',      // Blue
  digital_wallet: '#8b5cf6' // Purple
};

const RADIAN = Math.PI / 180;

// Active shape renderer for pie chart (donut style with hover)
const createRenderActiveShape = (baseCurrency, formatCurrency) => ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  fill,
  payload,
  percent,
  value,
}) => {
  const sin = Math.sin(-RADIAN * (midAngle ?? 1));
  const cos = Math.cos(-RADIAN * (midAngle ?? 1));
  const sx = (cx ?? 0) + ((outerRadius ?? 0) + 10) * cos;
  const sy = (cy ?? 0) + ((outerRadius ?? 0) + 10) * sin;
  const mx = (cx ?? 0) + ((outerRadius ?? 0) + 30) * cos;
  const my = (cy ?? 0) + ((outerRadius ?? 0) + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  // Format the value text with proper handling for large numbers
  const formattedValue = formatCurrency(value, baseCurrency);
  
  // Dynamically adjust font size based on text length
  let amountFontSize = 14;
  if (formattedValue.length > 14) {
    amountFontSize = 8;
  } else if (formattedValue.length > 12) {
    amountFontSize = 11;
  } else if (formattedValue.length > 10) {
    amountFontSize = 12;
  }

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={(outerRadius ?? 0) + 6}
        outerRadius={(outerRadius ?? 0) + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" fontSize={amountFontSize}>
        {formattedValue}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" fontSize="12">
        {`${((percent ?? 1) * 100).toFixed(2)}%`}
      </text>
    </g>
  );
};

function Wallets() {
  const navigate = useNavigate();
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [archiveConfirmModalOpened, setArchiveConfirmModalOpened] = useState(false);
  const [walletToArchive, setWalletToArchive] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);

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

  const { data, isLoading, error } = useWallets();
  const { data: referenceData, isLoading: referenceLoading } = useReferenceData();

  // Check if there are any archived wallets
  const [hasArchivedWallets, setHasArchivedWallets] = useState(false);

  // Check for archived wallets on mount and after archiving
  useEffect(() => {
    const checkArchivedWallets = async () => {
      try {
        const response = await authenticatedFetch('/api/wallets/archived/list');
        if (response.ok) {
          const responseData = await response.json();
          setHasArchivedWallets(responseData.count > 0);
        }
      } catch (error) {
        console.error('Error checking archived wallets:', error);
      }
    };
    checkArchivedWallets();
  }, [data]); // Re-check when wallets data changes

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

    const fromWallet = data?.wallets?.find(w => w.id === parseInt(fromWalletId));
    const toWallet = data?.wallets?.find(w => w.id === parseInt(toWalletId));

    if (fromWallet && toWallet && fromWallet.currency !== toWallet.currency) {
      checkExchangeRate(transactionDate, fromWallet.currency);
    } else {
      setExchangeRateInfo(null);
      setManualExchangeRate('');
    }
  }, [transactionDrawerOpened, transactionDate, fromWalletId, toWalletId, data, checkExchangeRate]);

  // Compute max allowed amount for transfers
  const maxAllowedAmount = useMemo(() => {
    if (!data?.wallets || data.totalLiquidity === undefined) return MAX_AMOUNT;

    let walletCurrency = data.baseCurrency || 'USD';
    if (fromWalletId) {
      const fromWallet = data.wallets.find(w => w.id.toString() === fromWalletId);
      if (fromWallet) {
        walletCurrency = fromWallet.currency;
      }
    }

    return parseFloat(getMaxAmountString(walletCurrency));
  }, [fromWalletId, data]);

  // Compute amount overflow warning
  const amountOverflowWarning = useMemo(() => {
    if (!amount || !data?.wallets || data.totalLiquidity === undefined) return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    let walletCurrency = data.baseCurrency || 'USD';
    if (fromWalletId) {
      const fromWallet = data.wallets.find(w => w.id.toString() === fromWalletId);
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
  }, [amount, fromWalletId, data]);


  const archiveWalletMutation = useMutation({
    mutationFn: async (walletId) => {
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
      // Close modal and drawer
      setArchiveConfirmModalOpened(false);
      setWalletToArchive(null);
      handleCloseDrawer();

      // Show success notification
      showSuccessNotification('Wallet archived successfully');

      // Invalidate and refetch wallets and transactions
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

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
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Then show notification and close drawer
      showSuccessNotification('Transfer created successfully');
      handleCloseTransactionDrawer();
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

  const handleArchiveWallet = (wallet) => {
    setWalletToArchive(wallet);
    setArchiveConfirmModalOpened(true);
  };

  const handleConfirmArchive = () => {
    if (walletToArchive) {
      archiveWalletMutation.mutate(walletToArchive.id);
    }
  };

  // Transfer from wallet handler
  const handleTransferFromWallet = (wallet) => {
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

  const handleEditWallet = (wallet) => {
    setSelectedWallet(wallet);
    setDrawerOpened(true);
  };

  const handleAddWallet = () => {
    setSelectedWallet(null);
    setDrawerOpened(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpened(false);
    setSelectedWallet(null);
  };

  return (
    <AppLayout>
      <Box w="100%">
        {data && data.wallets.length > 0 && (
          <Group justify="flex-end" gap="md">
            {hasArchivedWallets && (
              <ArchivedWalletsManager 
                trigger="button"
                buttonVariant="subtle"
                buttonText="View Archived Wallets"
              />
            )}
            <Button
              color="blue.9"
              radius="sm"
              leftSection={<IconWallet size={18} />}
              onMouseDown={createRipple}
              onClick={handleAddWallet}
              w={200}
            >
              Add Wallet
            </Button>
          </Group>
        )}

        {isLoading && (
          <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <Loader size="lg" color="var(--blue-9)" />
          </Box>
        )}
        
        {error && (
          <Text c="red" mt="md">Error: {error.message}</Text>
        )}
        
        {data && data.wallets.length === 0 && (
          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              padding: '40px'
            }}
          >
            <Stack gap="lg" align="center">
              <Stack gap="xs" align="center">
                <Text size="xl" fw={600} c="gray.9">
                  No active wallets yet
                </Text>
                <Text size="sm" c="gray.7" ta="center">
                  Create a wallet to start tracking your money and transactions.
                </Text>
              </Stack>
              <Stack gap="sm" align="center">
                <Button
                  color="blue.9"
                  radius="sm"
                  leftSection={<IconWallet size={18} />}
                  onMouseDown={createRipple}
                  onClick={handleAddWallet}
                  w={200}
                >
                  Add Wallet
                </Button>
                {hasArchivedWallets && (
                  <ArchivedWalletsManager 
                    trigger="button"
                    buttonVariant="subtle"
                    buttonText="View Archived Wallets"
                  />
                )}
              </Stack>
            </Stack>
          </Box>
        )}
        
        {data && data.wallets.length > 0 && (
          <Stack gap="md" mt="md">
            {/* Liquidity Summary Box */}
            <Box
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--gray-4)',
                boxShadow: 'var(--mantine-shadow-md)'
              }}
            >
              <Group align="flex-start">
                  {/* Liquidity */}
                  <Stack gap="xs" style={{ flex: '1 1 0', minWidth: 0 }}>
                    <Group gap="xs">
                      <IconCoins size={20} color="var(--blue-9)" />
                      <Text size="xs" c="gray.11" fw={500}>
                        LIQUIDITY
                      </Text>
                    </Group>
                    {data.wallets.some(w => w.currency !== data.baseCurrency) ? (
                      <Tooltip
                        label={
                          <>
                            This total includes assets in multiple currencies.
                            <br /><br />
                            All amounts have been converted to your base currency ({data.baseCurrency}) using the latest exchange rates.
                          </>
                        }
                        multiline
                        w={280}
                        withArrow
                        position="bottom"
                        styles={{
                          tooltip: { fontSize: '12px', lineHeight: 1.4 }
                        }}
                      >
                        <Text 
                          fw={600} 
                          style={{ 
                            cursor: 'help',
                            fontSize: (() => {
                              const formattedAmount = formatCurrency(data.totalLiquidity, data.baseCurrency);
                              if (formattedAmount.length > 20) return '14px';
                              if (formattedAmount.length > 15) return '16px';
                              if (formattedAmount.length > 12) return '18px';
                              return '20px';
                            })()
                          }}
                        >
                          <Text component="span" style={{ color: 'var(--gray-9)' }}>≈ </Text>
                          {formatCurrency(data.totalLiquidity, data.baseCurrency)}
                        </Text>
                      </Tooltip>
                    ) : (
                      <Text 
                        fw={600} 
                        style={{
                          fontSize: (() => {
                            const formattedAmount = formatCurrency(data.totalLiquidity, data.baseCurrency);
                            if (formattedAmount.length > 20) return '14px';
                            if (formattedAmount.length > 15) return '16px';
                            if (formattedAmount.length > 12) return '18px';
                            return '20px';
                          })()
                        }}
                      >
                        {formatCurrency(data.totalLiquidity, data.baseCurrency)}
                      </Text>
                    )}
                </Stack>

                <Divider orientation="vertical" />

                {/* Available for Spending */}
                <Stack gap="xs" style={{ flex: '1 1 0', minWidth: 0 }}>
                    <Group gap="xs">
                      <IconShoppingCart size={20} color="var(--blue-9)" />
                      <Text size="xs" c="gray.11" fw={500}>
                        AVAILABLE FOR SPENDING
                      </Text>
                    </Group>
                    {data.wallets.some(w => w.currency !== data.baseCurrency && w.include_in_balance) ? (
                      <Tooltip
                        label={
                          <>
                            This total includes wallets in multiple currencies.
                            <br /><br />
                            All amounts have been converted to your base currency ({data.baseCurrency}) using the latest exchange rates.
                          </>
                        }
                        multiline
                        w={280}
                        withArrow
                        position="bottom"
                        styles={{
                          tooltip: { fontSize: '12px', lineHeight: 1.4 }
                        }}
                      >
                        <Text 
                          fw={600} 
                          style={{ 
                            cursor: 'help',
                            fontSize: (() => {
                              const formattedAmount = formatCurrency(data.availableForSpending, data.baseCurrency);
                              if (formattedAmount.length > 20) return '14px';
                              if (formattedAmount.length > 15) return '16px';
                              if (formattedAmount.length > 12) return '18px';
                              return '20px';
                            })()
                          }}
                        >
                          <Text component="span" style={{ color: 'var(--gray-9)' }}>≈ </Text>
                          {formatCurrency(data.availableForSpending, data.baseCurrency)}
                        </Text>
                      </Tooltip>
                    ) : (
                      <Text 
                        fw={600} 
                        style={{
                          fontSize: (() => {
                            const formattedAmount = formatCurrency(data.availableForSpending, data.baseCurrency);
                            if (formattedAmount.length > 20) return '14px';
                            if (formattedAmount.length > 15) return '16px';
                            if (formattedAmount.length > 12) return '18px';
                            return '20px';
                          })()
                        }}
                      >
                        {formatCurrency(data.availableForSpending, data.baseCurrency)}
                      </Text>
                    )}
                </Stack>

                <Divider orientation="vertical" />

                {/* Excluded (Savings & Locked) */}
                <Stack gap="xs" style={{ flex: '1 1 0', minWidth: 0 }}>
                    <Group gap="xs">
                      <IconPigMoney size={20} color="var(--blue-9)" />
                      <Text size="xs" c="gray.11" fw={500}>
                        EXCLUDED (SAVINGS & LOCKED)
                      </Text>
                    </Group>
                    {data.wallets.some(w => w.currency !== data.baseCurrency && !w.include_in_balance) ? (
                      <Tooltip
                        label={
                          <>
                            This total includes wallets in multiple currencies.
                            <br /><br />
                            All amounts have been converted to your base currency ({data.baseCurrency}) using the latest exchange rates.
                          </>
                        }
                        multiline
                        w={280}
                        withArrow
                        position="bottom"
                        styles={{
                          tooltip: { fontSize: '12px', lineHeight: 1.4 }
                        }}
                      >
                        <Text fw={600} size="xl" style={{ cursor: 'help' }}>
                          <Text component="span" style={{ color: 'var(--gray-9)' }}>≈ </Text>
                          {formatCurrency(data.excludedBalance, data.baseCurrency)}
                        </Text>
                      </Tooltip>
                    ) : (
                      <Text fw={600} size="xl">
                        {formatCurrency(data.excludedBalance, data.baseCurrency)}
                      </Text>
                    )}
                </Stack>
              </Group>
            </Box>
            
            {(() => {
              // Calculate how many wallet types have balances > 0
              const walletTypesWithBalance = WALLET_TYPES.filter((walletType) => {
                const walletsOfType = data.wallets.filter(w => w.type === walletType.value);
                const typeTotal = walletsOfType.reduce((sum, w) => {
                  const balance = w.balance_in_base_currency !== undefined 
                    ? w.balance_in_base_currency 
                    : parseFloat(w.current_balance);
                  return sum + balance;
                }, 0);
                return typeTotal > 0;
              }).length;

              const showPieChart = walletTypesWithBalance >= 2;

              return (
                <Group gap="md" align="flex-start" wrap="nowrap">
                  {/* Wallet Types Container */}
                  <Box style={{ 
                    flex: showPieChart ? '0 0 50%' : '1 1 100%',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px' 
                  }}>
                {WALLET_TYPES.map((walletType) => {
                  // Filter wallets by this type
                  const walletsOfType = data.wallets.filter(w => w.type === walletType.value);
                  
                  // Skip if no wallets of this type
                  if (walletsOfType.length === 0) return null;
                  
                  // Calculate total for this type in base currency (all wallets converted to base currency)
                  const typeTotal = walletsOfType.reduce((sum, w) => {
                    // Use balance_in_base_currency if available, otherwise use current_balance
                    const balance = w.balance_in_base_currency !== undefined 
                      ? w.balance_in_base_currency 
                      : parseFloat(w.current_balance);
                    return sum + balance;
                  }, 0);
                  // Always display in base currency since we're summing converted balances
                  const typeCurrency = data.baseCurrency;
                  
                  // Check if this type has any wallets in non-base currency
                  const hasNonBaseCurrency = walletsOfType.some(w => w.currency !== data.baseCurrency);
                  
                  return (
                    <Accordion 
                      key={walletType.value}
                    variant="separated"
                    defaultValue={walletType.value}
                    chevron={null}
                    styles={{
                      item: {
                        border: 'none',
                        boxShadow: 'var(--mantine-shadow-md)'
                      }
                    }}
                  >
                    <Accordion.Item value={walletType.value}>
                      <Accordion.Control 
                        style={{ 
                          pointerEvents: 'none',
                          cursor: 'default'
                        }}
                      >
                        <Group justify="space-between" pr="md">
                          <Group>
                            <Text size="sm">{walletType.label}</Text>
                            <Text size="sm" c="gray.9">({walletsOfType.length})</Text>
                          </Group>
                          {hasNonBaseCurrency ? (
                            <Tooltip
                              label={
                                <>
                                  This total includes wallets in multiple currencies.
                                  <br /><br />
                                  All amounts have been converted to your base currency ({data.baseCurrency}) using the latest exchange rates.
                                </>
                              }
                              multiline
                              w={280}
                              withArrow
                              position="bottom"
                              styles={{
                                tooltip: { fontSize: '12px', lineHeight: 1.4 }
                              }}
                            >
                              <Text fw={600} size="sm" style={{ marginRight: '22px', cursor: 'help', pointerEvents: 'auto' }}>
                                <Text component="span" style={{ color: 'var(--gray-9)' }}>≈ </Text>
                                {formatCurrency(typeTotal, typeCurrency)}
                              </Text>
                            </Tooltip>
                          ) : (
                            <Text fw={600} size="sm" style={{ marginRight: '22px' }}>
                              {formatCurrency(typeTotal, typeCurrency)}
                            </Text>
                          )}
                        </Group>
                      </Accordion.Control>
                      <Divider />
                      <Accordion.Panel>
                      <Box style={{ 
                        maxHeight: walletsOfType.length > 5 ? '400px' : 'none', 
                        overflowY: walletsOfType.length > 5 ? 'auto' : 'visible', 
                        overflowX: 'hidden' 
                      }}>
                        <Stack gap={0}>
                          {walletsOfType.map((wallet, index) => {
                          // Get first letter of first two words
                          const words = wallet.name.split(' ');
                          const initials = (words[0]?.charAt(0) || '') + (words[1]?.charAt(0) || '');
                          
                          return (
                            <Box key={wallet.id}>
                              <Box 
                                py="md"
                                style={{ 
                                  display: 'grid',
                                  gridTemplateColumns: '280px 120px 1fr',
                                  gap: '16px',
                                  alignItems: 'center'
                                }}
                              >
                                {/* Column 1: Wallet info */}
                                <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                                  {wallet.icon && (wallet.icon.startsWith('data:image') || wallet.icon.startsWith('http')) ? (
                                    <Box
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--gray-3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}
                                    >
                                      <img 
                                        src={wallet.icon} 
                                        alt={wallet.name}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'contain'
                                        }}
                                      />
                                    </Box>
                                  ) : (
                                    <Avatar 
                                      radius="md" 
                                      size="md"
                                      color="white"
                                      style={{
                                        backgroundColor: `var(--${wallet.color}-9)`,
                                        flexShrink: 0
                                      }}
                                    >
                                      {initials}
                                    </Avatar>
                                  )}
                                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                    <Group gap="xs" wrap="nowrap">
                                      <Tooltip 
                                        label={wallet.name}
                                        disabled={wallet.name.length <= 18}
                                        withArrow
                                      >
                                        <Text 
                                          size="sm" 
                                          fw={500}
                                          component="a"
                                          onClick={() => navigate(`/wallets/${wallet.id}`)}
                                          style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                            textDecoration: 'none',
                                            color: 'inherit'
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                        >
                                          {wallet.name}
                                        </Text>
                                      </Tooltip>
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
                                              color: wallet.include_in_balance ? 'var(--green-9)' : 'var(--gray-9)',
                                              flexShrink: 0
                                            }
                                          }}
                                        >
                                          {wallet.include_in_balance ? "Included" : "Excluded"}
                                        </Badge>
                                      </Tooltip>
                                    </Group>
                                  </div>
                                </Group>
                                
                                {/* Column 2: Sparkline */}
                                <Box 
                                  style={{ 
                                    width: '120px', 
                                    height: '44px',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    style={{ width: '100%', height: '100%' }}
                                  >
                                    <style>
                                      {`
                                        @keyframes drawLine-${wallet.id} {
                                          to {
                                            stroke-dashoffset: 0;
                                          }
                                        }
                                        .sparkline-${wallet.id} svg polyline,
                                        .sparkline-${wallet.id} svg path {
                                          stroke-dasharray: 1000;
                                          stroke-dashoffset: 1000;
                                          animation: drawLine-${wallet.id} 10s ease-out forwards;
                                          animation-delay: ${index * 0.1}s;
                                        }
                                      `}
                                    </style>
                                    <div className={`sparkline-${wallet.id}`}>
                                      <Sparklines 
                                        data={wallet.balance_history && wallet.balance_history.length > 0 ? wallet.balance_history : [0]} 
                                        width={100} 
                                        height={36}
                                        margin={5}
                                      >
                                        <SparklinesLine 
                                          style={{ 
                                            stroke: 'var(--gray-9)',
                                            strokeWidth: 0.5,
                                            fill: 'none'
                                          }} 
                                        />
                                        {/* <SparklinesSpots style={{ fill: 'var(--gray-9)', fillOpacity: 1 }} /> */}
                                      </Sparklines>
                                    </div>
                                  </motion.div>
                                </Box>
                                
                                {/* Column 3: Amount + Menu */}
                                <Group gap="md" align="center" wrap="nowrap" style={{ justifySelf: 'end' }}>
                                  <Text 
                                    fw={500} 
                                    style={{ 
                                      marginRight: '-6px',
                                      whiteSpace: 'nowrap',
                                      fontSize: (() => {
                                        const formattedAmount = formatCurrency(wallet.current_balance, wallet.currency);
                                        if (formattedAmount.length > 20) return '10px';
                                        if (formattedAmount.length > 15) return '11px';
                                        if (formattedAmount.length > 12) return '12px';
                                        return '14px';
                                      })()
                                    }}
                                  >
                                    {formatCurrency(wallet.current_balance, wallet.currency)}
                                  </Text>
                                  <Menu shadow="md" width={200} position="right-start">
                                    <Menu.Target>
                                      <ActionIcon 
                                        variant="subtle"
                                        radius="sm"
                                        color="gray.11"
                                        className="wallet-edit-icon"
                                        style={{
                                          color: `var(--gray-12)`
                                        }}
                                      >
                                        <IconDotsVertical size={16} />
                                      </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                      <Menu.Item
                                        leftSection={<IconEdit size={16} />}
                                        onClick={() => handleEditWallet(wallet)}
                                      >
                                        Edit Wallet
                                      </Menu.Item>
                                      <Menu.Item
                                        leftSection={<IconArrowsExchange size={16} />}
                                        onClick={() => handleTransferFromWallet(wallet)}
                                      >
                                        Transfer From Wallet
                                      </Menu.Item>
                                      <Menu.Item
                                        leftSection={<IconReceipt size={16} />}
                                        onClick={() => {
                                          navigate(`/wallets/${wallet.id}`);
                                        }}
                                      >
                                        Wallet Details
                                      </Menu.Item>
                                    </Menu.Dropdown>
                                  </Menu>
                                </Group>
                              </Box>
                              {index < walletsOfType.length - 1 && <Divider />}
                            </Box>
                          );
                        })}
                        </Stack>
                      </Box>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
                  );
                })}
              </Box>

              {/* Wallet Type Distribution Pie Chart - Only show if 2+ wallet types exist */}
              {showPieChart && (
                <Box
                    className="pie-chart-container-2"
                    style={{
                      width: '50%',
                      boxSizing: 'border-box',
                      background: 'white',
                      borderRadius: '8px',
                      padding: '20px 0',
                      border: '1px solid var(--gray-4)',
                      boxShadow: 'var(--mantine-shadow-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'visible'
                    }}
                  >
                <style>
                  {`
                    .pie-chart-container-2 * {
                      outline: none !important;
                    }
                    .pie-chart-container-2 *:focus {
                      outline: none !important;
                    }
                    .pie-chart-container-2 *:active {
                      outline: none !important;
                    }
                    .pie-chart-container-2 .recharts-surface {
                      outline: none !important;
                    }
                    .pie-chart-container-2 svg {
                      outline: none !important;
                    }
                    .pie-chart-container-2 path {
                      outline: none !important;
                    }
                    .pie-chart-container-2 g {
                      outline: none !important;
                    }
                    .pie-chart-container-2 text {
                      outline: none !important;
                    }
                  `}
                </style>
                <Text size="sm" fw={600} mb="md" c="gray.9">
                  WALLET TYPE DISTRIBUTION
                </Text>
                <PieChart
                  width={500}
                  height={420}
                  tabIndex={-1}
                  margin={{
                    top: 60,
                    right: 120,
                    bottom: 80,
                    left: 120,
                  }}
                >
                  <Pie
                    activeShape={createRenderActiveShape(data.baseCurrency, formatCurrency)}
                    data={(() => {
                      // Build pie chart data from wallet types
                      return WALLET_TYPES.map((walletType) => {
                        const walletsOfType = data.wallets.filter(w => w.type === walletType.value);
                        const typeTotal = walletsOfType.reduce((sum, w) => {
                          const balance = w.balance_in_base_currency !== undefined
                            ? w.balance_in_base_currency
                            : parseFloat(w.current_balance);
                          return sum + balance;
                        }, 0);

                        return {
                          name: walletType.label,
                          value: typeTotal,
                          type: walletType.value
                        };
                      }).filter(item => item.value > 0);
                    })()}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    dataKey="value"
                    isAnimationActive={true}
                  >
                    {(() => {
                      const pieData = WALLET_TYPES.map((walletType) => {
                        const walletsOfType = data.wallets.filter(w => w.type === walletType.value);
                        const typeTotal = walletsOfType.reduce((sum, w) => {
                          const balance = w.balance_in_base_currency !== undefined
                            ? w.balance_in_base_currency
                            : parseFloat(w.current_balance);
                          return sum + balance;
                        }, 0);

                        return {
                          name: walletType.label,
                          value: typeTotal,
                          type: walletType.value
                        };
                      }).filter(item => item.value > 0);

                      return pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WALLET_TYPE_COLORS[entry.type]} />
                      ));
                    })()}
                  </Pie>
                  <RechartsTooltip content={() => null} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={50}
                    layout="horizontal"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: '50px',
                    }}
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'nowrap' }}>
                          {payload.map((entry, index) => (
                            <div key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ 
                                width: '12px', 
                                height: '12px', 
                                borderRadius: '50%', 
                                backgroundColor: entry.color 
                              }} />
                              <span style={{ fontSize: '13px', color: '#333', whiteSpace: 'nowrap' }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </PieChart>
                </Box>
              )}
                </Group>
              );
            })()}
          </Stack>
        )}
      </Box>

      <WalletDrawer
        opened={drawerOpened}
        onClose={handleCloseDrawer}
        selectedWallet={selectedWallet}
        onArchiveWallet={handleArchiveWallet}
        baseCurrency={data?.baseCurrency}
      />

      {/* Archive Wallet Confirmation Modal */}
      <ArchiveWalletModal
        opened={archiveConfirmModalOpened}
        onClose={() => {
          setArchiveConfirmModalOpened(false);
          setWalletToArchive(null);
        }}
        wallet={walletToArchive}
        onConfirm={handleConfirmArchive}
        isLoading={archiveWalletMutation.isPending}
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
            const fromWallet = data?.wallets?.find(w => w.id.toString() === fromWalletId);
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
        walletsData={data}
        walletsLoading={isLoading}
        referenceData={referenceData}
        referenceLoading={referenceLoading}
        filteredCategories={[]}
        suggestedTags={referenceData?.tags?.filter(tag => !selectedTags.includes(tag.id)) || []}
        availableTagsForSearch={referenceData?.tags?.filter(tag => 
          !selectedTags.includes(tag.id) && 
          tag.name.toLowerCase().includes(tagSearchValue.toLowerCase())
        ) || []}
        toWalletOptions={data?.wallets?.filter(w => w.id.toString() !== fromWalletId).map(w => ({
          value: w.id.toString(),
          label: w.name,
          wallet: w
        })) || []}
        amountOverflowWarning={amountOverflowWarning}
        walletBalanceWarning={null}
        fromWalletBalanceWarning={null}
        maxAllowedAmount={maxAllowedAmount}
        isOverdraftBlocked={false}
        hasChanges={false}
        isSubmitting={createTransferMutation.isPending}
        onSubmit={handleTransactionSubmit}
        amountInputRef={amountInputRef}
        createRipple={createRipple}
        exchangeRateInfo={exchangeRateInfo}
        checkingExchangeRate={checkingExchangeRate}
        manualExchangeRate={manualExchangeRate}
        onManualExchangeRateChange={setManualExchangeRate}
        baseCurrency={data?.baseCurrency || 'USD'}
      />
    </AppLayout>
  );
}

export default Wallets;
