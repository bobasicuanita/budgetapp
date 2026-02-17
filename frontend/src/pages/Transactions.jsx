import AppLayout from '../components/AppLayout';
import { Button, Drawer, Stack, Text, NumberInput, Chip, Group, Select, MultiSelect, Badge, Box, TextInput, Tooltip, Accordion, Loader, Divider, Grid, Title, Popover, Modal, Checkbox, Skeleton } from '@mantine/core';
import { DateInput, DatePickerInput } from '@mantine/dates';
import { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconCalendar, IconAlertTriangle, IconFilter, IconEdit, IconTrash, IconSearch, IconX, IconArrowsRightLeft, IconDownload } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { useRipple } from '../hooks/useRipple';
import { useWallets } from '../hooks/useWallets';
import { useReferenceData } from '../hooks/useReferenceData';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency } from '../data/currencies';
import { authenticatedFetch } from '../utils/api';
import { MAX_AMOUNT } from '../utils/amountValidation';
import '../styles/inputs.css';

// Memoized transaction item component to prevent unnecessary re-renders
const TransactionItem = memo(({ transaction, isLastItem, onEdit, onDelete }) => {
  return (
    <div key={transaction.id}>
      <Accordion.Item value={transaction.id.toString()}>
        <Accordion.Control>
          <Grid align="center" gutter="xs">
            {/* Merchant/Counterparty/Transfer Info */}
            <Grid.Col span={3}>
              <Text 
                size="sm" 
                fw={500} 
                style={{ 
                  color: transaction.type === 'transfer'
                    ? 'var(--gray-12)'
                    : transaction.type === 'income' 
                    ? (transaction.counterparty ? 'var(--gray-12)' : 'var(--gray-9)')
                    : (transaction.merchant ? 'var(--gray-12)' : 'var(--gray-9)')
                }}
              >
                {transaction.type === 'transfer' 
                  ? `From ${transaction.wallet_name} → To ${transaction.to_wallet_name}`
                  : transaction.type === 'income' 
                  ? (transaction.counterparty || '[No source specified]')
                  : (transaction.merchant || '[No merchant specified]')
                }
              </Text>
            </Grid.Col>

            {/* Category icon + name */}
            <Grid.Col span={3}>
              <Group gap="xs" wrap="nowrap">
                {transaction.type === 'transfer' ? (
                  <IconArrowsRightLeft size={18} style={{ color: 'var(--blue-9)' }} />
                ) : transaction.category_icon ? (
                  <Text size="md" style={{ lineHeight: 1 }}>
                    {transaction.category_icon}
                  </Text>
                ) : null}
                <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                  {transaction.category_name || 'Transfer'}
                </Text>
              </Group>
            </Grid.Col>

            {/* Wallet name(s) */}
            <Grid.Col span={3}>
              <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                {transaction.type === 'transfer' 
                  ? `${transaction.wallet_name}, ${transaction.to_wallet_name}`
                  : transaction.wallet_name
                }
              </Text>
            </Grid.Col>

            {/* Amount */}
            <Grid.Col span={3}>
              <Text 
                size="sm" 
                fw={500}
                style={{ 
                  textAlign: 'right',
                  marginRight: '16px',
                  color: transaction.type === 'income' ? 'var(--green-9)' : transaction.type === 'expense' ? 'var(--gray-12)' : 'var(--blue-9)'
                }}
              >
                {transaction.type === 'income' ? '+' : ''}
                {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
              </Text>
            </Grid.Col>
          </Grid>
        </Accordion.Control>

        <Accordion.Panel>
          <Box p="sm">
            <Stack gap="sm">
              {/* Description, Tags, and Transfer Details in one row */}
              <Grid gutter="md">
                {/* Description */}
                <Grid.Col span={transaction.type === 'transfer' ? 6 : 6}>
                  <Box>
                    <Text size="xs" fw={500} style={{ color: 'var(--gray-11)', marginBottom: '4px' }}>
                      Description:
                    </Text>
                    <Text size="sm" style={{ color: transaction.description ? 'var(--gray-12)' : 'var(--gray-9)' }}>
                      {transaction.description || 'No description'}
                    </Text>
                  </Box>
                </Grid.Col>
                
                {/* Tags (not for transfers) */}
                {transaction.type !== 'transfer' && (
                  <Grid.Col span={6}>
                    <Box>
                      <Text size="xs" fw={500} style={{ color: 'var(--gray-11)', marginBottom: '6px' }}>
                        Tags:
                      </Text>
                      {transaction.tags && transaction.tags.length > 0 ? (
                        <Group gap="xs">
                          {transaction.tags.map(tag => (
                            <Badge 
                              key={tag.id} 
                              size="sm"
                              variant="filled"
                              color="blue.9"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </Group>
                      ) : (
                        <Text size="sm" style={{ color: 'var(--gray-12)' }}>
                          —
                        </Text>
                      )}
                    </Box>
                  </Grid.Col>
                )}

                {/* Transfer wallet details (only for transfers) */}
                {transaction.type === 'transfer' && (
                  <Grid.Col span={6}>
                    <Box>
                      <Text size="xs" fw={500} style={{ color: 'var(--gray-11)', marginBottom: '4px' }}>
                        Transfer:
                      </Text>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="xs" fw={500} style={{ color: 'var(--gray-11)' }}>
                          From wallet:
                        </Text>
                        <Text size="xs" style={{ color: 'var(--gray-12)' }}>
                          {transaction.wallet_name}
                        </Text>
                      </Group>
                      <Group gap="xs" wrap="nowrap" mt={4}>
                        <Text size="xs" fw={500} style={{ color: 'var(--gray-11)' }}>
                          To wallet:
                        </Text>
                        <Text size="xs" style={{ color: 'var(--gray-12)' }}>
                          {transaction.to_wallet_name}
                        </Text>
                      </Group>
                    </Box>
                  </Grid.Col>
                )}
              </Grid>

              <Divider/>

              {/* Created/Updated at and Actions - same row */}
              <Group justify="space-between" align="center">
                <Group gap="md" divider={<Divider orientation="vertical" />}>
                  <Box>
                    <Text size="xs" style={{ color: 'var(--gray-11)' }}>
                      Created at: <Text component="span" fw={600}>{new Date(transaction.created_at).toLocaleString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</Text>
                    </Text>
                  </Box>
                  
                  {new Date(transaction.updated_at).getTime() !== new Date(transaction.created_at).getTime() && (
                    <Box>
                      <Text size="xs" style={{ color: 'var(--gray-11)' }}>
                        Last updated at: <Text component="span" fw={700}>{new Date(transaction.updated_at).toLocaleString('en-GB', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</Text>
                      </Text>
                    </Box>
                  )}
                </Group>

                {/* Actions */}
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    color="blue.9"
                    c="blue.9"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => onEdit(transaction)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="subtle"
                    size="xs"
                    color="red.9"
                    c="red.9"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => onDelete(transaction)}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Box>
        </Accordion.Panel>
      </Accordion.Item>
      
      {/* Add divider after each transaction */}
      {!isLastItem && (
        <Divider my={4} />
      )}
    </div>
  );
});

TransactionItem.displayName = 'TransactionItem';

// Memoized date group component
const DateGroup = memo(({ group, onEdit, onDelete }) => {
  return (
    <div key={group.label}>
      {/* Date header */}
      <Box 
        p="xs"
        style={{ 
          backgroundColor: 'var(--gray-2)',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
          {group.label}
        </Text>
        <Text 
          size="sm" 
          fw={600} 
          style={{ 
            color: group.sum >= 0 ? 'var(--green-9)' : 'var(--gray-12)' 
          }}
        >
          {group.sum >= 0 ? '+' : ''}
          {formatCurrency(Math.abs(group.sum), group.currency)}
        </Text>
      </Box>

      {/* Transactions for this date */}
      <Accordion
        styles={{
          item: {
            border: 'none',
            borderRadius: 0
          },
          control: {
            paddingTop: '8px',
            paddingBottom: '8px',
            '&:hover': {
              backgroundColor: 'var(--blue-2)',
            }
          },
          label: {
            padding: 0
          },
          content: {
            padding: 0
          }
        }}
      >
        {group.transactions.map((transaction, index) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            isLastItem={index === group.transactions.length - 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Accordion>
    </div>
  );
});

DateGroup.displayName = 'DateGroup';

// Memoized transaction list component - prevents re-renders when drawer state changes
const TransactionList = memo(({ 
  groupedTransactions, 
  transactionsLoading, 
  hasActiveFilters,
  isFetchingNextPage,
  loadMoreRef,
  onEdit, 
  onDelete 
}) => {
  if (transactionsLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Loader color="blue.9" size="md" />
      </Box>
    );
  }

  if (groupedTransactions.length === 0) {
    return (
      <Box style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-9)' }}>
        <Text size="lg" fw={500} style={{ color: 'var(--gray-11)' }}>
          {hasActiveFilters ? 'No transactions match the selected filters' : 'No transactions found'}
        </Text>
        {!hasActiveFilters && (
          <Text size="sm" mt="xs" style={{ color: 'var(--gray-9)' }}>
            Create your first transaction to get started
          </Text>
        )}
      </Box>
    );
  }

  return (
    <>
      <Stack gap={0}>
        {groupedTransactions.map((group) => (
          <DateGroup
            key={group.label}
            group={group}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Stack>
      
      {/* Infinite scroll sentinel - triggers loading when visible */}
      {isFetchingNextPage && (
        <Box 
          style={{ 
            textAlign: 'center', 
            padding: '16px'
          }}
        >
          <Loader color="blue.9" size="sm" />
        </Box>
      )}
      
      {/* Hidden sentinel for intersection observer */}
      <div ref={loadMoreRef} style={{ height: '1px' }} />
    </>
  );
});

TransactionList.displayName = 'TransactionList';

function Transactions() {
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [filtersDrawerOpened, setFiltersDrawerOpened] = useState(false);
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
  const [tempDateRange, setTempDateRange] = useState([null, null]);
  const [datePopoverOpened, setDatePopoverOpened] = useState(false);
  
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
  
  // Search state
  const [searchExpanded, setSearchExpanded] = useState(() => !!searchParams.get('search'));
  const [searchCollapsing, setSearchCollapsing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(() => searchParams.get('search') || '');
  
  // Debounced versions of text/number inputs (500ms delay)
  const [debouncedMinAmount] = useDebouncedValue(filterMinAmount, 500);
  const [debouncedMaxAmount] = useDebouncedValue(filterMaxAmount, 500);
  const [debouncedCounterparty] = useDebouncedValue(filterCounterparty, 500);
  
  // Delete modal state
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  
  // Idempotency key for preventing duplicate submissions
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  
  // Ref for amount input to programmatically focus
  const amountInputRef = useRef(null);
  
  // Ref for search input to programmatically focus
  const searchInputRef = useRef(null);
  
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
    filterIncludeFuture
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
           filterIncludeFuture === true;
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
    filterIncludeFuture
  ]);

  // Count active filters (excluding date and search)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterTransactionTypes.length > 0) count += filterTransactionTypes.length;
    if (filterWallets.length > 0) count += filterWallets.length;
    if (filterCategories.length > 0) count += filterCategories.length;
    if (filterTags.length > 0) count += filterTags.length;
    if (filterMinAmount !== '' || filterMaxAmount !== '') count += 1;
    if (filterCounterparty.trim() !== '') count += 1;
    if (filterIncludeFuture === true) count += 1;
    return count;
  }, [
    filterTransactionTypes,
    filterWallets,
    filterCategories,
    filterTags,
    filterMinAmount,
    filterMaxAmount,
    filterCounterparty,
    filterIncludeFuture
  ]);

  // Track if we're transitioning from filtered to unfiltered state
  const [isTransitioning, setIsTransitioning] = useState(false);


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


  // Filter categories based on transaction type
  const filteredCategories = useMemo(() => {
    if (!referenceData?.categories) return [];

    if (transactionType === 'income') {
      return referenceData.categories.filter(cat => cat.type === 'income');
    } else if (transactionType === 'expense') {
      return referenceData.categories.filter(cat => cat.type === 'expense');
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
    if (!amount || !walletsData?.wallets) return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    // Check if amount itself exceeds maximum for any transaction type
    if (amountNum > MAX_AMOUNT) {
      // Get wallet info for proper currency and calculation
      let selectedWallet = null;
      if (transactionType === 'income' && walletId) {
        selectedWallet = walletsData.wallets.find(w => w.id.toString() === walletId);
      } else if (transactionType === 'expense' && walletId) {
        selectedWallet = walletsData.wallets.find(w => w.id.toString() === walletId);
      } else if (transactionType === 'transfer' && toWalletId) {
        selectedWallet = walletsData.wallets.find(w => w.id.toString() === toWalletId);
      }

      if (selectedWallet) {
        const maxAllowed = transactionType === 'income' || transactionType === 'transfer'
          ? MAX_AMOUNT - selectedWallet.current_balance
          : MAX_AMOUNT; // For expenses, just use MAX_AMOUNT
        
        return {
          type: 'wallet_overflow',
          maxAllowed,
          currency: selectedWallet.currency,
          currentBalance: selectedWallet.current_balance
        };
      }

      // Fallback if no wallet selected
      return {
        type: 'wallet_overflow',
        maxAllowed: MAX_AMOUNT,
        currency: 'USD',
        currentBalance: 0
      };
    }

    // Check if transaction would cause wallet to exceed maximum
    if (transactionType === 'income' && walletId) {
      const selectedWallet = walletsData.wallets.find(w => w.id.toString() === walletId);
      if (selectedWallet) {
        const newBalance = selectedWallet.current_balance + amountNum;
        if (newBalance > MAX_AMOUNT) {
          const maxAllowed = MAX_AMOUNT - selectedWallet.current_balance;
          return {
            type: 'wallet_overflow',
            maxAllowed,
            currency: selectedWallet.currency,
            currentBalance: selectedWallet.current_balance
          };
        }
      }
    } else if (transactionType === 'transfer' && toWalletId) {
      const selectedWallet = walletsData.wallets.find(w => w.id.toString() === toWalletId);
      if (selectedWallet) {
        const newBalance = selectedWallet.current_balance + amountNum;
        if (newBalance > MAX_AMOUNT) {
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
  }, [amount, transactionType, walletId, toWalletId, walletsData]);

  // Calculate dynamic max amount for NumberInput (prevents clamping to wrong value on blur)
  const maxAllowedAmount = useMemo(() => {
    if (!walletsData?.wallets) return MAX_AMOUNT;

    if (transactionType === 'income' && walletId) {
      const selectedWallet = walletsData.wallets.find(w => w.id.toString() === walletId);
      if (selectedWallet) {
        return MAX_AMOUNT - selectedWallet.current_balance;
      }
    } else if (transactionType === 'transfer' && toWalletId) {
      const selectedWallet = walletsData.wallets.find(w => w.id.toString() === toWalletId);
      if (selectedWallet) {
        return MAX_AMOUNT - selectedWallet.current_balance;
      }
    }

    return MAX_AMOUNT;
  }, [transactionType, walletId, toWalletId, walletsData]);

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
          currency: null
        };
      }
      
      groups[dateLabel].transactions.push(transaction);
      // Calculate daily sum (exclude transfers - they don't affect net worth)
      if (transaction.type !== 'transfer') {
        groups[dateLabel].sum += parseFloat(transaction.amount) || 0;
      }
      // Use the first transaction's currency
      if (!groups[dateLabel].currency) {
        groups[dateLabel].currency = transaction.currency;
      }
    });

    // Convert to array and sort by date descending
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [transactionsData]);

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

  // Format date filter button text
  const dateFilterButtonText = useMemo(() => {
    if (dateFilterType === 'custom' && dateRange && dateRange[0] && dateRange[1]) {
      // Ensure dates are Date objects
      const startDate = dateRange[0] instanceof Date ? dateRange[0] : new Date(dateRange[0]);
      const endDate = dateRange[1] instanceof Date ? dateRange[1] : new Date(dateRange[1]);
      const sameYear = startDate.getFullYear() === endDate.getFullYear();
      
      const formatOptions = sameYear 
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
      
      const startStr = startDate.toLocaleDateString('en-US', formatOptions);
      const endStr = endDate.toLocaleDateString('en-US', formatOptions);
      
      return `${startStr} - ${endStr}`;
    }
    
    switch (dateFilterType) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'last7days':
        return 'Last 7 days';
      case 'lastMonth':
        return 'Last Month';
      case 'thisYear':
        return 'This Year';
      case 'lastYear':
        return 'Last Year';
      case 'allTime':
        return 'All time';
      case 'thisMonth':
      default:
        return 'This Month';
    }
  }, [dateFilterType, dateRange]);

  // Date filter tooltip text
  const dateFilterTooltip = useMemo(() => {
    if (dateFilterType === 'thisMonth') {
      return 'Click to select a custom date range';
    }
    if (dateFilterType === 'custom') {
      return 'Custom date range selected';
    }
    return 'Custom date range selected';
  }, [dateFilterType]);

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
    setCounterparty('');
    setDescription('');
    setShowTagInput(false);
    setTagSearchValue('');
    setIdempotencyKey(null);
  };

  // Handle search collapse with animation
  const handleCollapseSearch = () => {
    setSearchCollapsing(true);
    setTimeout(() => {
      setSearchExpanded(false);
      setSearchCollapsing(false);
    }, 200); // Match animation duration
  };

  // Handle clearing all filters (including date and excluding search)
  const handleClearAllFilters = () => {
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
    
    // Clear date filter
    setDateFilterType('thisMonth');
    setDateRange(null);
    setTempDateRange([null, null]);
    
    // Fallback: Clear transitioning state after a longer timeout in case data never arrives
    setTimeout(() => setIsTransitioning(false), 2000);
  };

  // Handle CSV download with all current filters
  const handleDownloadCSV = async () => {
    try {
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
      
      if (!response.ok) {
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
      
      showSuccessNotification('CSV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      showErrorNotification('Failed to download CSV');
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

  const handleApplyDateFilter = () => {
    if (tempDateRange && tempDateRange[0] && tempDateRange[1]) {
      // Ensure dates are Date objects
      const normalizedRange = [
        tempDateRange[0] instanceof Date ? tempDateRange[0] : new Date(tempDateRange[0]),
        tempDateRange[1] instanceof Date ? tempDateRange[1] : new Date(tempDateRange[1])
      ];
      setDateFilterType('custom');
      setDateRange(normalizedRange);
    }
    setDatePopoverOpened(false);
  };

  const handleClearDateFilter = () => {
    setDateFilterType('thisMonth');
    setDateRange(null);
    setTempDateRange([null, null]);
    setDatePopoverOpened(false);
  };

  const handleDateRangeChange = (range) => {
    setTempDateRange(range);
    
    // Check if this matches a preset (both dates selected)
    if (range && range[0] && range[1]) {
      // Ensure dates are Date objects
      const normalizedRange = [
        range[0] instanceof Date ? range[0] : new Date(range[0]),
        range[1] instanceof Date ? range[1] : new Date(range[1])
      ];
      
      const today = dayjs().startOf('day');
      const start = dayjs(normalizedRange[0]).startOf('day');
      const end = dayjs(normalizedRange[1]).startOf('day');
      
      // Check if matches "Today"
      if (start.isSame(today, 'day') && end.isSame(today, 'day')) {
        setDateFilterType('today');
        setDateRange(normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Yesterday"
      const yesterday = today.subtract(1, 'day');
      if (start.isSame(yesterday, 'day') && end.isSame(yesterday, 'day')) {
        setDateFilterType('yesterday');
        setDateRange(normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Last 7 days"
      const weekAgo = today.subtract(6, 'days');
      if (start.isSame(weekAgo, 'day') && end.isSame(today, 'day')) {
        setDateFilterType('last7days');
        setDateRange(normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Last Month"
      const firstDayLastMonth = today.subtract(1, 'month').startOf('month');
      const lastDayLastMonth = today.subtract(1, 'month').endOf('month').startOf('day');
      if (start.isSame(firstDayLastMonth, 'day') && end.isSame(lastDayLastMonth, 'day')) {
        setDateFilterType('lastMonth');
        setDateRange(normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "This Year"
      const firstDayThisYear = today.startOf('year');
      const lastDayThisYear = today.endOf('year').startOf('day');
      if (start.isSame(firstDayThisYear, 'day') && end.isSame(lastDayThisYear, 'day')) {
        setDateFilterType('thisYear');
        setDateRange(normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Last Year"
      const firstDayLastYear = today.subtract(1, 'year').startOf('year');
      const lastDayLastYear = today.subtract(1, 'year').endOf('year').startOf('day');
      if (start.isSame(firstDayLastYear, 'day') && end.isSame(lastDayLastYear, 'day')) {
        setDateFilterType('lastYear');
        setDateRange(normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "All time"
      const startOfTime = dayjs('2000-01-01');
      if (start.isSame(startOfTime, 'day') && end.isSame(today, 'day')) {
        setDateFilterType('allTime');
        setDateRange(normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
    }
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
    if (!editMode) return 'Add Transaction';
    if (transactionType === 'income') return 'Edit Income';
    if (transactionType === 'expense') return 'Edit Expense';
    return 'Edit Transfer';
  }, [editMode, transactionType]);

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

  return (
    <AppLayout>
      <Stack style={{ position: 'relative', height: '100%' }}>
        {/* Page Title and Add Transaction Button */}
        <Group justify="space-between" align="flex-start">
          <Title order={3}>Transactions</Title>
          <Button
            color="blue.9"
            radius="sm"
            leftSection={<IconPlus size={18} />}
            onMouseDown={createRipple}
            onClick={() => {
              setIdempotencyKey(uuidv4());
              setDrawerOpened(true);
            }}
            w={200}
          >
            Add Transaction
          </Button>
        </Group>

        {/* Summary Boxes */}
        <Group gap="md" grow>
          {/* Total Income */}
          <Box style={{ 
            background: 'white', 
            borderRadius: '8px', 
            padding: '16px', 
            boxShadow: 'var(--mantine-shadow-sm)' 
          }}>
            <Text size="xs" fw={500} style={{ color: 'var(--gray-11)', marginBottom: '8px' }}>
              TOTAL INCOME
            </Text>
            {(transactionsLoading || transactionsFetching || isTransitioning) && groupedTransactions.length === 0 ? (
              <Skeleton height={32} width="30%" />
            ) : (
              <Text size="xl" fw={600} style={{ color: 'var(--green-9)' }}>
                +{formatCurrency(totals.totalIncome, totals.currency)}
              </Text>
            )}
          </Box>

          {/* Total Expenses */}
          <Box style={{ 
            background: 'white', 
            borderRadius: '8px', 
            padding: '16px', 
            boxShadow: 'var(--mantine-shadow-sm)' 
          }}>
            <Text size="xs" fw={500} style={{ color: 'var(--gray-11)', marginBottom: '8px' }}>
              TOTAL EXPENSES
            </Text>
            {(transactionsLoading || transactionsFetching || isTransitioning) && groupedTransactions.length === 0 ? (
              <Skeleton height={32} width="30%" />
            ) : (
              <Text size="xl" fw={600} style={{ color: 'var(--red-9)' }}>
                -{formatCurrency(totals.totalExpense, totals.currency)}
              </Text>
            )}
          </Box>

          {/* Net Income */}
          <Box style={{ 
            background: 'white', 
            borderRadius: '8px', 
            padding: '16px', 
            boxShadow: 'var(--mantine-shadow-sm)' 
          }}>
            <Text size="xs" fw={500} style={{ color: 'var(--gray-11)', marginBottom: '8px' }}>
              NET INCOME
            </Text>
            {(transactionsLoading || transactionsFetching || isTransitioning) && groupedTransactions.length === 0 ? (
              <Skeleton height={32} width="30%" />
            ) : (
              <Text size="xl" fw={600} style={{ color: totals.netIncome >= 0 ? 'var(--green-9)' : 'var(--red-9)' }}>
                {totals.netIncome >= 0 ? '+' : ''}{formatCurrency(totals.netIncome, totals.currency)}
              </Text>
            )}
          </Box>
        </Group>

        {/* Transactions List */}
        {(() => {
          const hasLoadedData = transactionsData?.pages?.length > 0;
          const hasAnyTransactionsInData = transactionsData?.pages?.some(page => page?.transactions?.length > 0);
          
          // Show loading on initial load (before any data is loaded)
          if (transactionsLoading && !hasLoadedData) {
            return (
              <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader color="blue.9" size="lg" />
              </Box>
            );
          }
          
          // If list is empty and we're fetching/transitioning, show loader
          if (groupedTransactions.length === 0 && (transactionsFetching || isFetchingNextPage || isTransitioning)) {
            return (
              <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', padding: '40px 0' }}>
                <Loader color="blue.9" size="md" />
              </Box>
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
          <Box style={{ backgroundColor: 'white', borderRadius: '8px', width: '100%', boxShadow: 'var(--mantine-shadow-sm)', overflow: 'hidden' }}>
            <Box p="md" style={{ borderBottom: '1px solid var(--gray-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              {/* Download CSV Button */}
              <Button 
                variant="subtle" 
                color="blue.9"
                c="blue.9"
                leftSection={<IconDownload size={18} />}
                size="sm"
                onClick={handleDownloadCSV}
              >
                Download CSV
              </Button>

              {/* Right side buttons */}
              <Box style={{ display: 'flex', gap: '8px' }}>
              {/* Expandable Search */}
              {searchExpanded ? (
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '300px',
                    animation: searchCollapsing ? 'collapseSearch 200ms ease-out' : 'expandSearch 200ms ease-out',
                    transformOrigin: 'right',
                  }}
                >
                  <TextInput
                    ref={searchInputRef}
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={(e) => {
                      // Don't collapse if clicking icons
                      const relatedTarget = e.relatedTarget;
                      if (relatedTarget?.hasAttribute('data-search-action')) {
                        return;
                      }
                      if (!searchQuery.trim()) {
                        handleCollapseSearch();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchQuery('');
                        setAppliedSearchQuery('');
                        handleCollapseSearch();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        setAppliedSearchQuery(searchQuery);
                      }
                    }}
                    size="sm"
                    className="text-input"
                    style={{ width: '100%' }}
                    styles={{
                      root: { width: '100%' },
                    }}
                    rightSection={
                      <Group gap={4} wrap="nowrap" style={{ pointerEvents: 'all' }}>
                        {searchQuery && (
                          <IconX
                            size={16}
                            data-search-action
                            style={{ cursor: 'pointer', color: 'var(--gray-9)' }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSearchQuery('');
                              setAppliedSearchQuery('');
                              searchInputRef.current?.focus();
                            }}
                          />
                        )}
                        <IconSearch
                          size={16}
                          data-search-action
                          style={{ cursor: 'pointer', color: 'var(--blue-9)' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setAppliedSearchQuery(searchQuery);
                            searchInputRef.current?.focus();
                          }}
                        />
                      </Group>
                    }
                    rightSectionWidth={searchQuery ? 50 : 30}
                  />
                </Box>
              ) : (
                <Button 
                  variant="subtle" 
                  color="blue.9" 
                  c="blue.9"
                  leftSection={<IconSearch size={18} />}
                  size="sm"
                  onClick={() => {
                    setSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                >
                  Search
                </Button>
              )}

              <Popover 
                opened={datePopoverOpened} 
                onChange={setDatePopoverOpened}
                position="bottom-end"
                width={320}
                shadow="md"
                withArrow
                closeOnClickOutside={true}
                closeOnEscape={true}
                clickOutsideEvents={['mousedown', 'touchstart']}
              >
                <Popover.Target>
                  <Tooltip label={dateFilterTooltip} position="top">
                    <Button 
                      variant="subtle" 
                      color="blue.9" 
                      c="blue.9"
                      leftSection={<IconCalendar size={18} />}
                      size="sm"
                      onClick={() => {
                        const willOpen = !datePopoverOpened;
                        if (willOpen && dateFilterType === 'custom' && dateRange) {
                          setTempDateRange(dateRange);
                        } else if (willOpen && dateFilterType !== 'custom') {
                          setTempDateRange([null, null]);
                        }
                        setDatePopoverOpened(willOpen);
                      }}
                    >
                      {dateFilterButtonText}
                    </Button>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="md">
                    {/* Date range picker */}
                    <DatePickerInput
                      type="range"
                      placeholder="Pick date range"
                      value={tempDateRange}
                      onChange={handleDateRangeChange}
                      size="sm"
                      className="text-input"
                      defaultDate={new Date()}
                      popoverProps={{ 
                        withinPortal: false,
                        closeOnClickOutside: false,
                        clickOutsideEvents: []
                      }}
                      presets={[
                        { value: [dayjs().toDate(), dayjs().toDate()], label: 'Today' },
                        { value: [dayjs().subtract(1, 'day').toDate(), dayjs().subtract(1, 'day').toDate()], label: 'Yesterday' },
                        { value: [dayjs().subtract(6, 'days').toDate(), dayjs().toDate()], label: 'Last 7 days' },
                        { value: [dayjs().subtract(1, 'month').startOf('month').toDate(), dayjs().subtract(1, 'month').endOf('month').toDate()], label: 'Last Month' },
                        { value: [dayjs().startOf('year').toDate(), dayjs().endOf('year').toDate()], label: 'This Year' },
                        { value: [dayjs().subtract(1, 'year').startOf('year').toDate(), dayjs().subtract(1, 'year').endOf('year').toDate()], label: 'Last Year' },
                        { value: [dayjs('2000-01-01').toDate(), dayjs().toDate()], label: 'All time' },
                      ]}
                    />

                    {/* Action buttons */}
                    <Group justify="space-between">
                      <Button 
                        variant="subtle" 
                        size="xs" 
                        onClick={handleClearDateFilter}
                        c="blue.9"
                      >
                        Clear
                      </Button>
                      <Button 
                        variant="filled" 
                        size="xs" 
                        color="blue.9"
                        onClick={handleApplyDateFilter}
                        disabled={!tempDateRange || !tempDateRange[0] || !tempDateRange[1]}
                      >
                        Apply
                      </Button>
                    </Group>
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              <Button 
                variant="subtle" 
                color="blue.9"
                c="blue.9"
                leftSection={<IconFilter size={18} />}
                size="sm"
                onClick={() => setFiltersDrawerOpened(true)}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
              </Box>
            </Box>
            
            <TransactionList
              groupedTransactions={groupedTransactions}
              transactionsLoading={false}
              hasActiveFilters={hasActiveFilters}
              isFetchingNextPage={isFetchingNextPage}
              loadMoreRef={loadMoreRef}
              onEdit={handleOpenEditDrawer}
              onDelete={handleOpenDeleteModal}
            />
          </Box>
          );
        })()}

        {/* Drawer */}
        <Drawer
          opened={drawerOpened}
          onClose={handleCloseDrawer}
          position="right"
          title={drawerTitle}
          size="md"
          styles={{
            title: { 
              fontSize: '24px', 
              fontWeight: 700 
            }
          }}
        >
          <Stack gap="lg">
            {!editMode && (
              <div>
                <Text size="xs" fw={500} mb={8}>
                  Transaction Type
                </Text>
                <Chip.Group value={transactionType} onChange={handleTransactionTypeChange}>
                  <Group gap="sm">
                    <Chip value="income" size="sm" radius="md" color="blue.9">
                      Income
                    </Chip>
                    <Chip value="expense" size="sm" radius="md" color="blue.9">
                      Expense
                    </Chip>
                    <Tooltip
                      label="You need at least two wallets to make a transfer"
                      disabled={(walletsData?.wallets?.length || 0) >= 2}
                    >
                      <span>
                        <Chip 
                          value="transfer" 
                          size="sm" 
                          radius="md" 
                          color="blue.9"
                          disabled={(walletsData?.wallets?.length || 0) < 2}
                          styles={(walletsData?.wallets?.length || 0) < 2 ? {
                            label: { color: 'var(--gray-9) !important' }
                          } : undefined}
                        >
                          Transfer
                        </Chip>
                      </span>
                    </Tooltip>
                  </Group>
                </Chip.Group>
              </div>
            )}
            
            {/* Wallet dropdown - Only show for Income and Expense - MOVED BEFORE AMOUNT */}
            {(transactionType === 'income' || transactionType === 'expense') && (
              <>
                <Select
                  label="Wallet"
                  placeholder="Select wallet"
                  value={walletId}
                  onChange={setWalletId}
                  data={walletsData?.wallets?.map(wallet => ({
                    value: wallet.id.toString(),
                    label: wallet.name,
                    wallet: wallet
                  })) || []}
                  size="md"
                  className="text-input"
                  searchable
                  clearable
                  disabled={walletsLoading}
                  styles={{
                    label: { fontSize: '12px', fontWeight: 500 }
                  }}
                  renderOption={({ option }) => {
                    const wallet = option.wallet;
                    if (!wallet) return option.label;
                    
                    return (
                      <Group gap="xs" wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="lg" style={{ flexShrink: 0 }}>
                            {wallet.icon}
                          </Text>
                          <Text size="sm" style={{ flexShrink: 0 }}>
                            {wallet.name}
                          </Text>
                          <Badge
                            size="xs"
                            color={wallet.include_in_balance ? "green" : "gray"}
                            variant="light"
                            style={{ flexShrink: 0 }}
                            styles={{
                              root: {
                                color: wallet.include_in_balance ? 'var(--green-9)' : 'var(--gray-9)'
                              }
                            }}
                          >
                            {wallet.include_in_balance ? "Included" : "Excluded"}
                          </Badge>
                        </Group>
                        <Text size="sm" fw={600} c="gray.11" style={{ flexShrink: 0 }}>
                          {formatCurrency(wallet.current_balance, wallet.currency)}
                        </Text>
                      </Group>
                    );
                  }}
                />
              </>
            )}
            
            <NumberInput
              ref={amountInputRef}
              label="Amount"
              placeholder="0.00"
              value={amount}
              onChange={setAmount}
              onBlur={() => {
                // If there's an overflow warning, clamp to maxAllowed
                if (amountOverflowWarning && amountOverflowWarning.maxAllowed) {
                  setAmount(amountOverflowWarning.maxAllowed);
                }
              }}
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator=","
              min={0}
              max={maxAllowedAmount}
              size="md"
              className="text-input"
              autoFocus
              data-autofocus
              styles={{
                label: { fontSize: '12px', fontWeight: 500 }
              }}
            />

            {/* Amount overflow warning - Only show when exceeded */}
            {amountOverflowWarning && (
              <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                <IconAlertTriangle size={16} color="var(--red-9)" style={{ flexShrink: 0 }} />
                <Text size="xs" c="red.9">
                  Maximum allowed amount for this wallet: {formatCurrency(amountOverflowWarning.maxAllowed, amountOverflowWarning.currency)}
                </Text>
              </Group>
            )}

            {/* Wallet balance warning for expenses - Only show if no overflow warning */}
            {!amountOverflowWarning && walletBalanceWarning && (
              <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                <IconAlertTriangle size={16} color={walletBalanceWarning.walletType === 'cash' ? "var(--red-9)" : "var(--orange-8)"} style={{ flexShrink: 0 }} />
                <Text size="xs" c={walletBalanceWarning.walletType === 'cash' ? "red.9" : "orange.7"}>
                  Amount exceeds wallet balance by {formatCurrency(walletBalanceWarning.difference, walletBalanceWarning.currency)}
                  {walletBalanceWarning.walletType === 'cash' && ' (Cash wallets cannot be overdrawn)'}
                </Text>
              </Group>
            )}

            {/* From wallet balance warning for transfers - Only show if no overflow warning */}
            {!amountOverflowWarning && fromWalletBalanceWarning && (
              <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                <IconAlertTriangle size={16} color={fromWalletBalanceWarning.walletType === 'cash' ? "var(--red-9)" : "var(--orange-8)"} style={{ flexShrink: 0 }} />
                <Text size="xs" c={fromWalletBalanceWarning.walletType === 'cash' ? "red.9" : "orange.7"}>
                  Amount exceeds wallet balance by {formatCurrency(fromWalletBalanceWarning.difference, fromWalletBalanceWarning.currency)}
                  {fromWalletBalanceWarning.walletType === 'cash' && ' (Cash wallets cannot be overdrawn)'}
                </Text>
              </Group>
            )}

            {/* From Wallet and To Wallet - Only show for Transfer */}
            {transactionType === 'transfer' && (
              <>
                <Select
                  label="From Wallet"
                  placeholder="Select wallet"
                  value={fromWalletId}
                  onChange={handleFromWalletChange}
                  data={walletsData?.wallets?.map(wallet => ({
                    value: wallet.id.toString(),
                    label: wallet.name,
                    wallet: wallet
                  })) || []}
                  size="md"
                  className="text-input"
                  searchable
                  clearable
                  disabled={walletsLoading}
                  styles={{
                    label: { fontSize: '12px', fontWeight: 500 }
                  }}
                  renderOption={({ option }) => {
                    const wallet = option.wallet;
                    if (!wallet) return option.label;
                    
                    return (
                      <Group gap="xs" wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="lg" style={{ flexShrink: 0 }}>
                            {wallet.icon}
                          </Text>
                          <Text size="sm" style={{ flexShrink: 0 }}>
                            {wallet.name}
                          </Text>
                          <Badge
                            size="xs"
                            color={wallet.include_in_balance ? "green" : "gray"}
                            variant="light"
                            style={{ flexShrink: 0 }}
                            styles={{
                              root: {
                                color: wallet.include_in_balance ? 'var(--green-9)' : 'var(--gray-9)'
                              }
                            }}
                          >
                            {wallet.include_in_balance ? "Included" : "Excluded"}
                          </Badge>
                        </Group>
                        <Text size="sm" fw={600} c="gray.11" style={{ flexShrink: 0 }}>
                          {formatCurrency(wallet.current_balance, wallet.currency)}
                        </Text>
                      </Group>
                    );
                  }}
                />

                <Select
                  label="To Wallet"
                  placeholder="Select wallet"
                  value={toWalletId}
                  onChange={setToWalletId}
                  data={toWalletOptions}
                  size="md"
                  className="text-input"
                  searchable
                  clearable
                  disabled={walletsLoading || !fromWalletId}
                  styles={{
                    label: { fontSize: '12px', fontWeight: 500 }
                  }}
                  renderOption={({ option }) => {
                    const wallet = option.wallet;
                    if (!wallet) return option.label;
                    
                    return (
                      <Group gap="xs" wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="lg" style={{ flexShrink: 0 }}>
                            {wallet.icon}
                          </Text>
                          <Text size="sm" style={{ flexShrink: 0 }}>
                            {wallet.name}
                          </Text>
                          <Badge
                            size="xs"
                            color={wallet.include_in_balance ? "green" : "gray"}
                            variant="light"
                            style={{ flexShrink: 0 }}
                            styles={{
                              root: {
                                color: wallet.include_in_balance ? 'var(--green-9)' : 'var(--gray-9)'
                              }
                            }}
                          >
                            {wallet.include_in_balance ? "Included" : "Excluded"}
                          </Badge>
                        </Group>
                        <Text size="sm" fw={600} c="gray.11" style={{ flexShrink: 0 }}>
                          {formatCurrency(wallet.current_balance, wallet.currency)}
                        </Text>
                      </Group>
                    );
                  }}
                />
              </>
            )}

            {/* Category dropdown - Only show for Income and Expense */}
            {(transactionType === 'income' || transactionType === 'expense') && (
              <Select
                label="Category"
                placeholder={`Select ${transactionType} category`}
                value={category}
                onChange={handleCategoryChange}
                data={filteredCategories.map(cat => ({
                  value: cat.id.toString(),
                  label: cat.name,
                  category: cat // Pass full category object for custom rendering
                }))}
                size="md"
                className="text-input"
                searchable
                clearable
                disabled={referenceLoading}
                styles={{
                  label: { fontSize: '12px', fontWeight: 500 }
                }}
                renderOption={({ option }) => {
                  const category = option.category;
                  if (!category) return option.label;
                  
                  return (
                    <Group gap="xs" wrap="nowrap">
                      {/* Category icon */}
                      <Text size="lg" style={{ flexShrink: 0 }}>
                        {category.icon}
                      </Text>
                      
                      {/* Category name */}
                      <Text size="sm">
                        {category.name}
                      </Text>
                    </Group>
                  );
                }}
              />
            )}

            {/* Tags section - Only show if category is selected */}
            {category && (
              <div>
                <Text size="xs" fw={500} mb={8}>
                  Tags:
                </Text>
                <Stack gap="xs">
                  <Group gap="xs" align="flex-start">
                    {/* Suggested tags */}
                    {suggestedTags.length > 0 && (
                      <Chip.Group 
                        multiple 
                        value={selectedTags} 
                        onChange={(values) => {
                          // Prevent selecting more than 5 tags total
                          if (values.length + customTags.length <= 5) {
                            setSelectedTags(values);
                          }
                        }}
                      >
                        <Group gap="xs">
                          {suggestedTags.map(tag => {
                            const isDisabled = !selectedTags.includes(tag.id) && maxTagsReached;
                            return (
                              <Chip
                                key={tag.id}
                                value={tag.id}
                                size="sm"
                                variant={selectedTags.includes(tag.id) ? 'filled' : 'outline'}
                                color="blue.9"
                                disabled={isDisabled}
                                styles={isDisabled ? {
                                  label: { color: 'var(--gray-9) !important' }
                                } : undefined}
                              >
                                {tag.name}
                              </Chip>
                            );
                          })}
                        </Group>
                      </Chip.Group>
                    )}

                    {/* Custom tags (manually added) - using Chip instead of Badge */}
                    {customTags.map(tag => (
                      <Chip
                        key={tag.id}
                        checked={true}
                        size="sm"
                        variant="filled"
                        color="blue.9"
                        onChange={() => handleRemoveCustomTag(tag.id)}
                      >
                        {tag.name}
                      </Chip>
                    ))}

                    {/* Add tag input or button */}
                    {!maxTagsReached && (
                      <>
                        {!showTagInput ? (
                          <Badge
                            size="lg"
                            variant="filled"
                            color="blue.9"
                            onClick={() => setShowTagInput(true)}
                            style={{ cursor: 'pointer', paddingLeft: '12px', paddingRight: '12px' }}
                          >
                            + Add tag
                          </Badge>
                        ) : (
                          <Select
                            placeholder="Search or create tag..."
                            data={[
                              ...availableTagsForSearch,
                              ...(tagSearchValue && !availableTagsForSearch.some(t => t.label.toLowerCase() === tagSearchValue.toLowerCase())
                                ? [{ value: `create:${tagSearchValue}`, label: `Create tag: ${tagSearchValue}` }]
                                : [])
                            ]}
                            value={null}
                            onChange={handleAddTag}
                            searchable
                            searchValue={tagSearchValue}
                            onSearchChange={setTagSearchValue}
                            size="sm"
                            style={{ minWidth: '200px' }}
                            onBlur={() => {
                              if (!tagSearchValue) {
                                setShowTagInput(false);
                              }
                            }}
                            autoFocus
                            data-autofocus
                            nothingFoundMessage="Type to create new tag"
                          />
                        )}
                      </>
                    )}
                  </Group>
                  
                  <Text size="xs" c="gray.11">
                    You can add up to 5 tags
                  </Text>
                </Stack>
              </div>
            )}

            <div>
              <Text size="xs" fw={500} mb={8}>
                Date
              </Text>
              <Chip.Group value={quickDateSelection} onChange={handleQuickDateSelect}>
                <Group gap="sm" mb="sm">
                  <Chip value="today" size="sm" radius="md" color="blue.9">
                    Today
                  </Chip>
                  <Chip value="yesterday" size="sm" radius="md" color="blue.9">
                    Yesterday
                  </Chip>
                  <Chip value="2days" size="sm" radius="md" color="blue.9">
                    2 days ago
                  </Chip>
                </Group>
              </Chip.Group>
              
              <DateInput
                placeholder="Select date"
                value={date}
                onChange={(value) => setDate(value || new Date())}
                size="md"
                className="text-input date-input-with-icon"
                valueFormat="DD/MM/YYYY"
                leftSection={<IconCalendar size={16} style={{ color: 'var(--gray-12)' }} />}
                clearable
              />
              
              {isFutureDate && (
                <Text size="xs" c="gray.11" mt={4}>
                  This transaction will appear on its selected date.
                </Text>
              )}
            </div>

            {/* Merchant input - Only show for Expense */}
            {transactionType === 'expense' && (
              <Box>
                <TextInput
                  label={
                    <Group gap={8} wrap="nowrap">
                      <Text size="xs" fw={500}>Merchant (optional)</Text>
                      <Badge size="xs" color="blue.9" c="blue.9" variant="light">Recommended</Badge>
                    </Group>
                  }
                  placeholder="Where did you spend?"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  size="md"
                  className="text-input"
                  maxLength={80}
                />
                <Text size="xs" c="gray.11" ta="right" mt={4}>
                  {merchant.length}/80
                </Text>
              </Box>
            )}

            {transactionType === 'income' && (
              <Box>
                <TextInput
                  label="Source (optional)"
                  placeholder="Who paid you?"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  size="md"
                  className="text-input"
                  maxLength={80}
                  styles={{
                    label: { fontSize: '12px', fontWeight: 500 }
                  }}
                />
                <Text size="xs" c="gray.11" ta="right" mt={4}>
                  {counterparty.length}/80
                </Text>
              </Box>
            )}

            <Box>
              <TextInput
                label="Description (optional)"
                placeholder="Add a note about this transaction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                size="md"
                className="text-input"
                maxLength={200}
                styles={{
                  label: { fontSize: '12px', fontWeight: 500 }
                }}
              />
              <Text size="xs" c="gray.11" ta="right" mt={4}>
                {description.length}/200
              </Text>
            </Box>

            <Button
              color="blue.9"
              size="md"
              fullWidth
              onMouseDown={createRipple}
              loading={createTransactionMutation.isPending || updateTransactionMutation.isPending}
              disabled={
                !amount || 
                !date || 
                isOverdraftBlocked ||
                (transactionType === 'transfer' && (!fromWalletId || !toWalletId)) ||
                (transactionType !== 'transfer' && !category) || 
                (transactionType !== 'transfer' && !walletId) ||
                (editMode && !hasChanges)
              }
              onClick={() => {
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
              }}
            >
              {editMode ? 'Update Transaction' : 'Add Transaction'}
            </Button>
          </Stack>
        </Drawer>

        {/* Filters Drawer */}
        <Drawer
          opened={filtersDrawerOpened}
          onClose={() => setFiltersDrawerOpened(false)}
          position="right"
          title="Filter your transactions"
          size="md"
        >
          <Stack gap="lg">
            {/* Transaction Type Filter */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
                Transaction Type
              </Text>
              <Chip.Group multiple value={filterTransactionTypes} onChange={setFilterTransactionTypes}>
                <Group gap="xs">
                  <Chip value="income" color="blue.9">Income</Chip>
                  <Chip value="expense" color="blue.9">Expense</Chip>
                  <Chip 
                    value="transfer" 
                    color="blue.9"
                    disabled={filterCategories.length > 0}
                  >
                    Transfer
                  </Chip>
                </Group>
              </Chip.Group>
              <Text size="xs" c="gray.9" mt={4}>
                Leave unselected to show all types
              </Text>
            </div>

            {/* Wallets Filter */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
                Wallets
              </Text>
              <MultiSelect
                placeholder="Select wallets"
                data={walletsData?.wallets?.map(wallet => ({
                  value: wallet.id.toString(),
                  label: `${wallet.icon} ${wallet.name} - ${formatCurrency(wallet.current_balance, wallet.currency)}`
                })) || []}
                value={filterWallets}
                onChange={setFilterWallets}
                searchable
                clearable
                className="text-input"
                size="sm"
              />
              <Text size="xs" c="gray.9" mt={4}>
                Show transactions from any of the selected wallets
              </Text>
            </div>

            {/* Categories Filter */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
                Categories
              </Text>
              <MultiSelect
                placeholder="Select categories"
                data={referenceData?.categories?.map(cat => ({
                  value: cat.id,
                  label: `${cat.icon} ${cat.name}`
                })) || []}
                value={filterCategories}
                onChange={(value) => {
                  setFilterCategories(value);
                  // If category selected, remove transfer from transaction types
                  if (value.length > 0 && filterTransactionTypes.includes('transfer')) {
                    setFilterTransactionTypes(filterTransactionTypes.filter(t => t !== 'transfer'));
                  }
                }}
                searchable
                clearable
                className="text-input"
                size="sm"
                disabled={filterTransactionTypes.includes('transfer')}
              />
              <Text size="xs" c="gray.9" mt={4}>
                Show transactions from any of the selected categories
              </Text>
            </div>

            {/* Tags Filter */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
                Tags
              </Text>
              <Select
                placeholder="Search and select tags"
                data={referenceData?.tags?.map(tag => ({
                  value: tag.id,
                  label: tag.name
                })) || []}
                value={null}
                onChange={(value) => {
                  if (value && !filterTags.includes(value)) {
                    setFilterTags([...filterTags, value]);
                  }
                }}
                searchable
                clearable
                className="text-input"
                size="sm"
              />
              {filterTags.length > 0 && (
                <Group gap="xs" mt="xs">
                  {filterTags.map(tagId => {
                    const tag = referenceData?.tags?.find(t => t.id === tagId);
                    return (
                      <Badge
                        key={tagId}
                        size="sm"
                        color="blue.9"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFilterTags(filterTags.filter(t => t !== tagId))}
                      >
                        {tag?.name} ×
                      </Badge>
                    );
                  })}
                </Group>
              )}
              <Text size="xs" c="gray.9" mt={4}>
                Transactions must have ALL selected tags
              </Text>
            </div>

            {/* Amount Range Filter */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
                Amount Range
              </Text>
              {(() => {
                const hasAmountRangeError = filterMinAmount !== '' && filterMaxAmount !== '' && parseFloat(filterMinAmount) > parseFloat(filterMaxAmount);
                return (
                  <>
                    <Group gap="xs" grow>
                      <NumberInput
                        placeholder="Min"
                        value={filterMinAmount}
                        onChange={(value) => setFilterMinAmount(value === null ? '' : value)}
                        min={0}
                        decimalScale={2}
                        className="text-input"
                        size="sm"
                        prefix="€ "
                        error={false}
                        styles={hasAmountRangeError ? {
                          input: { 
                            borderColor: 'var(--red-9) !important',
                            color: 'var(--gray-12)'
                          }
                        } : undefined}
                      />
                      <NumberInput
                        placeholder="Max"
                        value={filterMaxAmount}
                        onChange={(value) => setFilterMaxAmount(value === null ? '' : value)}
                        min={0}
                        decimalScale={2}
                        className="text-input"
                        size="sm"
                        prefix="€ "
                        error={false}
                        styles={hasAmountRangeError ? {
                          input: { 
                            borderColor: 'var(--red-9) !important',
                            color: 'var(--gray-12)'
                          }
                        } : undefined}
                      />
                    </Group>
                    {hasAmountRangeError && (
                      <Text size="xs" c="red.9" mt={4}>
                        Minimum amount cannot be greater than maximum
                      </Text>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Counterparty/Merchant Search */}
            <div>
              <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
                Merchant / Source
              </Text>
              <TextInput
                placeholder="Search by merchant or source"
                value={filterCounterparty}
                onChange={(e) => setFilterCounterparty(e.target.value)}
                className="text-input"
                size="sm"
              />
              <Text size="xs" c="gray.9" mt={4}>
                Search in merchant and counterparty fields
              </Text>
            </div>

            {/* Include Future Transactions */}
            <div>
              <Checkbox
                label="Include future transactions"
                checked={filterIncludeFuture}
                onChange={(e) => setFilterIncludeFuture(e.currentTarget.checked)}
                size="sm"
                color="blue.9"
              />
              <Text size="xs" c="gray.9" mt={4} ml={28}>
                Show transactions with dates in the future
              </Text>
            </div>

            {/* Clear All Filters Button */}
            <Button
              variant="subtle"
              color="blue.9"
              c="blue.9"
              fullWidth
              onClick={handleClearAllFilters}
            >
              Clear All Filters
            </Button>
          </Stack>
        </Drawer>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteModalOpened}
          onClose={() => {
            setDeleteModalOpened(false);
            setTransactionToDelete(null);
          }}
          title="Delete Transaction?"
          centered
          size="sm"
        >
          <Stack gap="md">
            {transactionToDelete && (
              <Box>
                <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                  {transactionToDelete.type === 'transfer' ? (
                    <>Transfer - {formatCurrency(Math.abs(transactionToDelete.amount), transactionToDelete.currency)}</>
                  ) : (
                    <>{transactionToDelete.category_icon} {transactionToDelete.category_name} - {
                      transactionToDelete.type === 'income' 
                        ? `+${formatCurrency(transactionToDelete.amount, transactionToDelete.currency)}`
                        : formatCurrency(Math.abs(transactionToDelete.amount), transactionToDelete.currency)
                    }</>
                  )}
                </Text>
                <Text size="xs" style={{ color: 'var(--gray-11)' }} mt={4}>
                  {new Date(transactionToDelete.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {
                    transactionToDelete.type === 'transfer'
                      ? `${transactionToDelete.wallet_name}, ${transactionToDelete.to_wallet_name}`
                      : transactionToDelete.wallet_name
                  }
                </Text>
              </Box>
            )}
            
            <Text size="sm" style={{ color: 'var(--gray-11)' }}>
              {transactionToDelete?.type === 'transfer' 
                ? 'This will permanently remove this transfer and update both wallet balances.'
                : 'This will permanently remove this transaction and update your balances and reports.'
              }
            </Text>
            
            <Group justify="flex-end" gap="xs">
              <Button
                variant="subtle"
                color="gray"
                c="gray.9"
                onClick={() => {
                  setDeleteModalOpened(false);
                  setTransactionToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                color="red.9"
                loading={deleteTransactionMutation.isPending}
                onClick={() => {
                  if (transactionToDelete) {
                    deleteTransactionMutation.mutate(transactionToDelete.id);
                  }
                }}
              >
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </AppLayout>
  );
}

export default Transactions;
