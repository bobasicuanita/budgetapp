import { memo } from 'react';
import { Box, Text, Stack, Loader, Accordion, Grid, Group, Badge, Divider, Button, Tooltip, Checkbox } from '@mantine/core';
import { IconEdit, IconTrash, IconArrowsRightLeft, IconAlertTriangle } from '@tabler/icons-react';
import PropTypes from 'prop-types';
import { formatCurrency } from '../../data/currencies';

// Memoized transaction item component to prevent unnecessary re-renders
const TransactionItem = memo(({ transaction, isLastItem, onEdit, onDelete, baseCurrency, bulkDeleteMode, isSelected, onToggle }) => {
  return (
    <div key={transaction.id}>
      <Accordion.Item value={transaction.id.toString()}>
        <Accordion.Control>
          <Grid align="center" gutter="xs">
            {/* Checkbox for bulk delete - disabled for system transactions */}
            {bulkDeleteMode && (
              <Grid.Col span={0.15}>
                <Tooltip
                  label="Balance adjustments can't be deleted"
                  disabled={!transaction.is_system}
                  withArrow
                  position="top"
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggle(transaction.id)}
                    size="xs"
                    color="blue.9"
                    onClick={(e) => e.stopPropagation()}
                    disabled={transaction.is_system}
                  />
                </Tooltip>
              </Grid.Col>
            )}
            
            {/* Merchant/Counterparty/Transfer Info */}
            <Grid.Col span={bulkDeleteMode ? 2.95 : 3} style={{ paddingLeft: bulkDeleteMode ? '12px' : undefined }}>
              <Text
                size="sm"
                fw={500} 
                style={{ 
                  color: transaction.is_system
                    ? 'var(--gray-12)'
                    : transaction.type === 'transfer'
                    ? 'var(--gray-12)'
                    : transaction.type === 'income' 
                    ? (transaction.counterparty ? 'var(--gray-12)' : 'var(--gray-9)')
                    : (transaction.merchant ? 'var(--gray-12)' : 'var(--gray-9)')
                }}
              >
                {transaction.type === 'transfer' 
                  ? `From ${transaction.wallet_name} → To ${transaction.to_wallet_name}`
                  : transaction.type === 'income' 
                  ? (transaction.is_system ? 'Balance Adjustment' : (transaction.counterparty || '[No source specified]'))
                  : (transaction.is_system ? 'Balance Adjustment' : (transaction.merchant || '[No merchant specified]'))
                }
              </Text>
            </Grid.Col>

            {/* Category icon + name */}
            <Grid.Col span={bulkDeleteMode ? 2.95 : 3}>
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
            <Grid.Col span={bulkDeleteMode ? 2.95 : 3}>
              <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
                {transaction.type === 'transfer' 
                  ? `${transaction.wallet_name}, ${transaction.to_wallet_name}`
                  : transaction.wallet_name
                }
              </Text>
            </Grid.Col>

            {/* Amount */}
            <Grid.Col span={3}>
              <Group gap={6} justify="flex-end" wrap="nowrap" style={{ marginRight: '16px' }}>
                {transaction.exchange_rate_date && transaction.exchange_rate_date !== transaction.date && !transaction.manual_exchange_rate && (
                  <Tooltip label="Another close exchange rate was used for this transaction" position="top">
                    <IconAlertTriangle size={14} style={{ color: 'var(--orange-8)', flexShrink: 0 }} />
                  </Tooltip>
                )}
                <Text 
                  size="sm" 
                  fw={500}
                  style={{ 
                    color: transaction.type === 'income' ? 'var(--green-9)' : transaction.type === 'expense' ? 'var(--gray-12)' : 'var(--blue-9)'
                  }}
                >
                  {transaction.type === 'income' ? '+' : ''}
                  {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                </Text>
              </Group>
            </Grid.Col>
          </Grid>
        </Accordion.Control>

        <Accordion.Panel>
          <Box p="sm">
            <Stack gap="sm">
              {/* Description, Tags, and Transfer Details */}
              <Grid gutter="md">
                {/* Description */}
                <Grid.Col span={3}>
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
                  <Grid.Col span={3}>
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
                  <Grid.Col span={3}>
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

                {/* Spacer to align with wallet column above */}
                <Grid.Col span={3}>
                  {/* Empty column for alignment */}
                </Grid.Col>

                {/* Exchange Rate (only if exchange rate was applied) - Far Right */}
                {(() => {
                  // For transfers, use paired exchange rate if own rate is null
                  const effectiveRate = transaction.exchange_rate_used || transaction.paired_exchange_rate_used;
                  const hasRate = effectiveRate && parseFloat(effectiveRate) !== 1;
                  
                  return hasRate;
                })() && (
                  <Grid.Col span={3}>
                    <Box style={{ textAlign: 'right' }}>
                      <Text size="xs" fw={500} style={{ color: 'var(--gray-11)', marginBottom: '4px' }}>
                        Exchange Rate:
                      </Text>
                      <Stack gap={4} align="flex-end">
                        <Text size="sm" style={{ color: 'var(--gray-12)' }}>
                          Converted at 1 {baseCurrency || 'USD'} = {parseFloat(transaction.exchange_rate_used || transaction.paired_exchange_rate_used).toFixed(4)} {transaction.type === 'transfer' ? (transaction.exchange_rate_used ? transaction.currency : transaction.to_wallet_currency) : transaction.currency} ≈ {formatCurrency(Math.abs(transaction.base_currency_amount || 0), baseCurrency || 'USD')}
                        </Text>
                        {(() => {
                          const rateDate = transaction.exchange_rate_date || transaction.paired_exchange_rate_date;
                          const isManual = transaction.manual_exchange_rate || transaction.paired_manual_exchange_rate;
                          return rateDate && rateDate !== transaction.date && !isManual && (
                            <Group gap={4} wrap="nowrap">
                              <IconAlertTriangle size={12} style={{ color: 'var(--orange-8)', flexShrink: 0 }} />
                              <Text size="xs" c="gray.9">
                                Rate from {new Date(rateDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Text>
                            </Group>
                          );
                        })()}
                        {(transaction.manual_exchange_rate || transaction.paired_manual_exchange_rate) && (
                          <Text size="xs" style={{ color: 'var(--blue-9)' }}>
                            Manual rate
                          </Text>
                        )}
                      </Stack>
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

                {/* Actions - Hide for system transactions */}
                {!transaction.is_system && (
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
                )}
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

TransactionItem.propTypes = {
  transaction: PropTypes.object.isRequired,
  isLastItem: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  baseCurrency: PropTypes.string,
  bulkDeleteMode: PropTypes.bool,
  isSelected: PropTypes.bool,
  onToggle: PropTypes.func,
};

// Memoized date group component
const DateGroup = memo(({ group, onEdit, onDelete, baseCurrency, bulkDeleteMode, selectedTransactions, onToggleTransaction }) => {
  // Check if this day has any transactions with exchange rate conversions
  const hasMultipleCurrencies = group.transactions.some(t => 
    t.type !== 'transfer' && 
    (t.exchange_rate_used || t.paired_exchange_rate_used) && 
    parseFloat(t.exchange_rate_used || t.paired_exchange_rate_used || 1) !== 1
  );

  return (
    <div key={group.label}>
      {/* Date header */}
      <Box 
        p="xs"
        style={{ 
          backgroundColor: 'var(--blue-3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
          {group.label}
        </Text>
        {hasMultipleCurrencies ? (
          <Tooltip 
            label={
              <div style={{ maxWidth: '250px' }}>
                This total includes transactions in multiple currencies.
                <br /><br />
                All amounts have been converted to your base currency ({group.currency}) using the exchange rate for each transaction date.
              </div>
            }
            withArrow
            position="left"
            multiline
          >
            <Group gap={4} wrap="nowrap" style={{ cursor: 'help' }}>
              <Text 
                size="sm" 
                fw={600}
                c="gray.9"
              >
                ≈
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
            </Group>
          </Tooltip>
        ) : (
          <Group gap={4} wrap="nowrap">
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
          </Group>
        )}
      </Box>

      {/* Transactions for this date */}
      <Accordion
        multiple
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
            baseCurrency={baseCurrency}
            bulkDeleteMode={bulkDeleteMode}
            isSelected={selectedTransactions.includes(transaction.id)}
            onToggle={onToggleTransaction}
          />
        ))}
      </Accordion>
    </div>
  );
});

DateGroup.displayName = 'DateGroup';

DateGroup.propTypes = {
  group: PropTypes.shape({
    label: PropTypes.string.isRequired,
    sum: PropTypes.number.isRequired,
    currency: PropTypes.string.isRequired,
    transactions: PropTypes.array.isRequired,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  baseCurrency: PropTypes.string,
  bulkDeleteMode: PropTypes.bool,
  selectedTransactions: PropTypes.array,
  onToggleTransaction: PropTypes.func,
};

/**
 * TransactionList - Displays grouped transactions with loading and empty states
 * Supports infinite scroll with intersection observer
 */
const TransactionList = memo(({ 
  groupedTransactions, 
  transactionsLoading, 
  hasActiveFilters,
  isFetchingNextPage,
  loadMoreRef,
  onEdit, 
  onDelete,
  baseCurrency,
  bulkDeleteMode,
  selectedTransactions,
  onToggleTransaction
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
            baseCurrency={baseCurrency}
            bulkDeleteMode={bulkDeleteMode}
            selectedTransactions={selectedTransactions}
            onToggleTransaction={onToggleTransaction}
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

TransactionList.propTypes = {
  groupedTransactions: PropTypes.array.isRequired,
  transactionsLoading: PropTypes.bool.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  isFetchingNextPage: PropTypes.bool.isRequired,
  loadMoreRef: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  baseCurrency: PropTypes.string,
  bulkDeleteMode: PropTypes.bool,
  selectedTransactions: PropTypes.array,
  onToggleTransaction: PropTypes.func,
};

export default TransactionList;
