import { Drawer, Stack, Text, NumberInput, Chip, Group, Select, Badge, Box, TextInput, Button, Tooltip, Alert, Loader, Avatar } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCalendar, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import PropTypes from 'prop-types';
import { formatCurrency, getCurrencySymbol } from '../../data/currencies';
import { getCurrencyDecimals, getCurrencyDecimalInfo } from '../../utils/currencyValidation';

/**
 * TransactionDrawer - Add/Edit transaction drawer component
 * Handles income, expense, and transfer transactions
 * @param {Object} props - Component props
 */
const TransactionDrawer = ({
  // Drawer state
  opened,
  onClose,
  editMode,
  drawerTitle,
  
  // Transaction state
  transactionType,
  amount,
  category,
  walletId,
  fromWalletId,
  toWalletId,
  date,
  merchant,
  counterparty,
  description,
  selectedTags,
  customTags,
  
  // Transfer mode
  transferFromWallet,
  fromWalletDisabled = false, // If set, locks to transfer mode and hides type selector
  
  // Transaction setters
  onTransactionTypeChange,
  onAmountChange,
  onAmountBlur,
  onCategoryChange,
  onWalletIdChange,
  onFromWalletIdChange,
  onToWalletIdChange,
  onDateChange,
  onMerchantChange,
  onCounterpartyChange,
  onDescriptionChange,
  onSelectedTagsChange,
  
  // Tag management
  showTagInput,
  setShowTagInput,
  tagSearchValue,
  setTagSearchValue,
  maxTagsReached,
  onAddTag,
  onRemoveCustomTag,
  
  // Quick date selection
  quickDateSelection,
  onQuickDateSelect,
  isFutureDate,
  
  // Reference data
  walletsData,
  walletsLoading,
  referenceData, // eslint-disable-line no-unused-vars
  referenceLoading,
  
  // Computed values
  filteredCategories,
  suggestedTags,
  availableTagsForSearch,
  toWalletOptions,
  amountOverflowWarning,
  walletBalanceWarning,
  fromWalletBalanceWarning,
  maxAllowedAmount,
  isOverdraftBlocked,
  hasChanges,
  
  // Mutations
  isSubmitting,
  onSubmit,
  
  // Refs
  amountInputRef,
  
  // Ripple effect
  createRipple,
  
  // Exchange rate
  exchangeRateInfo,
  checkingExchangeRate,
  manualExchangeRate,
  onManualExchangeRateChange,
  baseCurrency,
}) => {
  // Get wallet currency for exchange rate display and validation
  const walletCurrency = transactionType === 'transfer' 
    ? walletsData?.wallets?.find(w => w.id === parseInt(fromWalletId))?.currency
    : walletsData?.wallets?.find(w => w.id === parseInt(walletId))?.currency;
  
  // Get currency decimal info (only show when amount has a value > 0)
  const currencyDecimals = walletCurrency ? getCurrencyDecimals(walletCurrency) : 2;
  const currencyDecimalInfo = (walletCurrency && amount && parseFloat(amount) > 0) ? getCurrencyDecimalInfo(walletCurrency) : null;

  // Check if transfer is between different currencies
  const fromWallet = walletsData?.wallets?.find(w => w.id === parseInt(fromWalletId));
  const toWallet = walletsData?.wallets?.find(w => w.id === parseInt(toWalletId));
  const isDifferentCurrencyTransfer = transactionType === 'transfer' && 
    fromWallet && toWallet && 
    fromWallet.currency !== toWallet.currency;
  
  // Validate transaction date against wallet creation date
  // Transactions cannot be dated before the wallet's initial balance date
  let dateValidationError = null;
  if (date) {
    const transactionDate = date instanceof Date ? date : new Date(date);
    transactionDate.setHours(0, 0, 0, 0);
    
    if (transactionType === 'transfer') {
      // For transfers, check both wallets
      if (fromWallet) {
        const fromWalletCreated = new Date(fromWallet.created_at);
        fromWalletCreated.setHours(0, 0, 0, 0);
        if (transactionDate < fromWalletCreated) {
          const formattedDate = fromWalletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          dateValidationError = `Transactions can't be dated before the wallet's starting balance (${formattedDate})`;
        }
      }
      if (!dateValidationError && toWallet) {
        const toWalletCreated = new Date(toWallet.created_at);
        toWalletCreated.setHours(0, 0, 0, 0);
        if (transactionDate < toWalletCreated) {
          const formattedDate = toWalletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          dateValidationError = `Transactions can't be dated before the wallet's starting balance (${formattedDate})`;
        }
      }
    } else {
      // For income/expense, check the selected wallet
      const selectedWallet = walletsData?.wallets?.find(w => w.id === parseInt(walletId));
      if (selectedWallet) {
        const walletCreated = new Date(selectedWallet.created_at);
        walletCreated.setHours(0, 0, 0, 0);
        if (transactionDate < walletCreated) {
          const formattedDate = walletCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          dateValidationError = `Transactions can't be dated before the wallet's starting balance (${formattedDate})`;
        }
      }
    }
  }
  
  // Handle Enter key to submit form
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Check if submit button would be disabled
      const isDisabled = 
        !amount || 
        !date || 
        dateValidationError ||
        isOverdraftBlocked ||
        (transactionType === 'transfer' && (!fromWalletId || !toWalletId)) ||
        (transactionType !== 'transfer' && !category) || 
        (transactionType !== 'transfer' && !walletId) ||
        (editMode && !hasChanges) ||
        (exchangeRateInfo?.severity === 'critical' && (!manualExchangeRate || parseFloat(manualExchangeRate) <= 0));
      
      if (!isDisabled && !isSubmitting) {
        e.preventDefault();
        onSubmit();
      }
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
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
      <Stack gap="lg" onKeyDown={handleKeyDown}>
        {/* Transaction Type Selector - Only in Add mode and not in transfer-from-wallet mode */}
        {!editMode && !transferFromWallet && (
          <div>
            <Text size="xs" fw={500} mb={8}>
              Transaction Type
            </Text>
            <Chip.Group value={transactionType} onChange={onTransactionTypeChange}>
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
        
        {/* Wallet Selection - For Income/Expense only - BEFORE Amount */}
        {(transactionType === 'income' || transactionType === 'expense') && (
          <Select
            label="Wallet"
            placeholder="Select wallet"
            value={walletId}
            onChange={onWalletIdChange}
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
              label: { fontSize: '12px', fontWeight: 500 },
              input: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }
            }}
            renderOption={({ option }) => {
              const wallet = option.wallet;
              if (!wallet) return option.label;
              
              // Get wallet initials for colored avatar fallback
              const words = wallet.name.split(' ');
              const initials = (words[0]?.charAt(0) || '') + (words[1]?.charAt(0) || '');
              
              return (
                <Group gap="xs" wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
                  <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    {wallet.icon && (wallet.icon.startsWith('data:image') || wallet.icon.startsWith('http')) ? (
                      <Box
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
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
                        size="sm"
                        radius="sm"
                        color="white"
                        style={{
                          backgroundColor: `var(--${wallet.color}-9)`,
                          flexShrink: 0
                        }}
                      >
                        <Text size="xs">{initials}</Text>
                      </Avatar>
                    )}
                    <Text 
                      size="sm" 
                      style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        maxWidth: '120px'
                      }}
                    >
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
        )}
        
        {/* Wallet not marked for spending warning - For Expense only */}
        {transactionType === 'expense' && walletId && walletsData?.wallets && (() => {
          const selectedWallet = walletsData.wallets.find(w => w.id === parseInt(walletId));
          return selectedWallet && !selectedWallet.include_in_balance ? (
            <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px' }}>
              <IconAlertTriangle size={16} style={{ color: 'var(--orange-9)', flexShrink: 0 }} />
              <Text size="xs" style={{ color: 'var(--orange-9)' }}>
                This wallet is not marked for spending - you might want to use a different wallet.
              </Text>
            </Group>
          ) : null;
        })()}
        
        {/* Amount Input */}
        <NumberInput
          ref={amountInputRef}
          label="Amount"
          placeholder={currencyDecimals === 0 ? "0" : "0." + "0".repeat(currencyDecimals)}
          value={amount}
          onChange={onAmountChange}
          onBlur={onAmountBlur}
          decimalScale={currencyDecimals}
          fixedDecimalScale={false}
          thousandSeparator=","
          min={0}
          max={maxAllowedAmount}
          size="md"
          className="text-input"
          autoFocus
          data-autofocus
          prefix={walletCurrency ? getCurrencySymbol(walletCurrency) + ' ' : ''}
          styles={{
            label: { fontSize: '12px', fontWeight: 500 }
          }}
        />
        
        {/* Currency decimal info message */}
        {currencyDecimalInfo && (
          <Text size="xs" c="gray.9" style={{ marginTop: '-8px', marginBottom: '8px' }}>
            {currencyDecimalInfo}
          </Text>
        )}

        {/* Amount overflow warning */}
        {amountOverflowWarning && (
          <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <IconAlertTriangle size={16} color="var(--red-9)" style={{ flexShrink: 0 }} />
            <Text size="xs" c="red.9">
              {amountOverflowWarning.type === 'amount_overflow'
                ? amountOverflowWarning.message
                : amountOverflowWarning.type === 'liquidity_overflow'
                ? `Maximum allowed amount: ${formatCurrency(amountOverflowWarning.maxAllowed, amountOverflowWarning.currency)}`
                : `Maximum allowed amount for this wallet: ${formatCurrency(amountOverflowWarning.maxAllowed, amountOverflowWarning.currency)}`
              }
            </Text>
          </Group>
        )}

        {/* Wallet balance warning for expenses */}
        {!amountOverflowWarning && walletBalanceWarning && (
          <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <IconAlertTriangle size={16} color={walletBalanceWarning.walletType === 'cash' ? "var(--red-9)" : "var(--orange-8)"} style={{ flexShrink: 0 }} />
            <Text size="xs" c={walletBalanceWarning.walletType === 'cash' ? "red.9" : "orange.7"}>
              Amount exceeds wallet balance by {formatCurrency(walletBalanceWarning.difference, walletBalanceWarning.currency)}
              {walletBalanceWarning.walletType === 'cash' && ' (Cash wallets cannot be overdrawn)'}
            </Text>
          </Group>
        )}

        {/* From wallet balance warning for transfers */}
        {!amountOverflowWarning && fromWalletBalanceWarning && (
          <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px', marginBottom: '8px' }}>
            <IconAlertTriangle size={16} color={fromWalletBalanceWarning.walletType === 'cash' ? "var(--red-9)" : "var(--orange-8)"} style={{ flexShrink: 0 }} />
            <Text size="xs" c={fromWalletBalanceWarning.walletType === 'cash' ? "red.9" : "orange.7"}>
              Amount exceeds wallet balance by {formatCurrency(fromWalletBalanceWarning.difference, fromWalletBalanceWarning.currency)}
              {fromWalletBalanceWarning.walletType === 'cash' && ' (Cash wallets cannot be overdrawn)'}
            </Text>
          </Group>
        )}

        {/* From Wallet and To Wallet - For Transfer only */}
        {transactionType === 'transfer' && (
          <>
            <Select
              label="From Wallet"
              placeholder="Select wallet"
              value={fromWalletId}
              onChange={onFromWalletIdChange}
              data={walletsData?.wallets?.map(wallet => ({
                value: wallet.id.toString(),
                label: wallet.name,
                wallet: wallet
              })) || []}
              size="md"
              className="text-input"
              disabled={fromWalletDisabled || walletsLoading}
              searchable
              clearable
              styles={{
                label: { fontSize: '12px', fontWeight: 500 },
                input: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
              renderOption={({ option }) => {
                const wallet = option.wallet;
                if (!wallet) return option.label;

                // Get wallet initials for colored avatar fallback
                const words = wallet.name.split(' ');
                const initials = (words[0]?.charAt(0) || '') + (words[1]?.charAt(0) || '');

                return (
                  <Group gap="xs" wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      {wallet.icon && (wallet.icon.startsWith('data:image') || wallet.icon.startsWith('http')) ? (
                        <Box
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
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
                          size="sm"
                          radius="sm"
                          color="white"
                          style={{
                            backgroundColor: `var(--${wallet.color}-9)`,
                            flexShrink: 0
                          }}
                        >
                          <Text size="xs">{initials}</Text>
                        </Avatar>
                      )}
                      <Text 
                        size="sm" 
                        style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          maxWidth: '120px'
                        }}
                      >
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
            
            {/* From Wallet not marked for spending warning - For Transfer only */}
            {fromWalletId && walletsData?.wallets && (() => {
              const selectedFromWallet = walletsData.wallets.find(w => w.id === parseInt(fromWalletId));
              return selectedFromWallet && !selectedFromWallet.include_in_balance ? (
                <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px' }}>
                  <IconAlertTriangle size={16} style={{ color: 'var(--orange-9)', flexShrink: 0 }} />
                  <Text size="xs" style={{ color: 'var(--orange-9)' }}>
                    This wallet is not marked for spending - you might want to use a different wallet.
                  </Text>
                </Group>
              ) : null;
            })()}

            <Select
              label="To Wallet"
              placeholder="Select wallet"
              value={toWalletId}
              onChange={onToWalletIdChange}
              data={toWalletOptions}
              size="md"
              className="text-input"
              searchable
              clearable
              disabled={walletsLoading || !fromWalletId}
              styles={{
                label: { fontSize: '12px', fontWeight: 500 },
                input: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
              renderOption={({ option }) => {
                const wallet = option.wallet;
                if (!wallet) return option.label;

                // Get wallet initials for colored avatar fallback
                const words = wallet.name.split(' ');
                const initials = (words[0]?.charAt(0) || '') + (words[1]?.charAt(0) || '');

                return (
                  <Group gap="xs" wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      {wallet.icon && (wallet.icon.startsWith('data:image') || wallet.icon.startsWith('http')) ? (
                        <Box
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
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
                          size="sm"
                          radius="sm"
                          color="white"
                          style={{
                            backgroundColor: `var(--${wallet.color}-9)`,
                            flexShrink: 0
                          }}
                        >
                          <Text size="xs">{initials}</Text>
                        </Avatar>
                      )}
                      <Text 
                        size="sm" 
                        style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          maxWidth: '120px'
                        }}
                      >
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

            {/* Different currency transfer warning */}
            {isDifferentCurrencyTransfer && (
              <Text size="xs" c="blue.9" mt={4} style={{ fontStyle: 'italic' }}>
                You are moving money between wallets that use different currencies, so a conversion will happen.
              </Text>
            )}
          </>
        )}

        {/* Category - For Income/Expense only */}
        {(transactionType === 'income' || transactionType === 'expense') && (
          <Select
            label="Category"
            placeholder={`Select ${transactionType} category`}
            value={category}
            onChange={onCategoryChange}
            data={filteredCategories.map(cat => ({
              value: cat.id.toString(),
              label: cat.name,
              category: cat
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
                  <Text size="lg" style={{ flexShrink: 0 }}>
                    {category.icon}
                  </Text>
                  <Text size="sm">
                    {category.name}
                  </Text>
                </Group>
              );
            }}
          />
        )}

        {/* Tags - Only if category is selected */}
        {category && (
          <div>
            <Text size="xs" fw={500} mb={8}>
              Tags (optional)
            </Text>
            <Stack gap="xs">
              <Group gap="xs" align="flex-start">
                {/* Suggested tags */}
                {suggestedTags.length > 0 && (
                  <Chip.Group 
                    multiple 
                    value={selectedTags} 
                    onChange={(values) => {
                      if (values.length + customTags.length <= 5) {
                        onSelectedTagsChange(values);
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

                {/* Custom tags */}
                {customTags.map(tag => (
                  <Chip
                    key={tag.id}
                    checked={true}
                    size="sm"
                    variant="filled"
                    color="blue.9"
                    onChange={() => onRemoveCustomTag(tag.id)}
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
                        onChange={onAddTag}
                        searchable
                        searchValue={tagSearchValue}
                        onSearchChange={setTagSearchValue}
                        size="sm"
                        style={{ minWidth: '200px', marginBottom: '8px' }}
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

        {/* Date Selection */}
        <div>
          <Text size="xs" fw={500} mb={8}>
            Date
          </Text>
          <Chip.Group value={quickDateSelection} onChange={onQuickDateSelect}>
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
            onChange={(value) => onDateChange(value || new Date())}
            size="md"
            className="text-input date-input-with-icon"
            valueFormat="DD/MM/YYYY"
            leftSection={<IconCalendar size={16} style={{ color: 'var(--gray-12)' }} />}
            clearable
          />

          {dateValidationError && (
            <Text size="xs" style={{ color: 'var(--red-9)' }} mt={4}>
              {dateValidationError}
            </Text>
          )}

          {!dateValidationError && isFutureDate && (
            <Text size="xs" c="gray.11" mt={4}>
              This transaction will appear on its selected date.
            </Text>
          )}
        </div>

        {/* Exchange Rate Information */}
        {checkingExchangeRate && (
          (transactionType === 'transfer' && isDifferentCurrencyTransfer) ||
          (transactionType !== 'transfer' && walletCurrency && walletCurrency !== baseCurrency)
        ) && (
          <Box>
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="xs" c="gray.11">Checking exchange rate...</Text>
            </Group>
          </Box>
        )}

        {/* Exchange Rate Banners */}
        {exchangeRateInfo && amount && parseFloat(amount) > 0 && (
          (transactionType === 'transfer' && isDifferentCurrencyTransfer) ||
          (transactionType !== 'transfer' && walletCurrency && walletCurrency !== baseCurrency)
        ) && (() => {
          const { severity, rateDate, rateDisplay } = exchangeRateInfo;
          const amountNum = parseFloat(amount);
          const formattedDate = rateDate ? new Date(rateDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          
          // Calculate converted amount
          const effectiveRate = manualExchangeRate && parseFloat(manualExchangeRate) > 0 
            ? parseFloat(manualExchangeRate) 
            : (rateDisplay?.value || 0);
          
          const convertedAmount = amountNum * effectiveRate;
          const transactionCurrency = transactionType === 'transfer' ? fromWallet?.currency : walletCurrency;
          const targetCurrency = transactionType === 'transfer' ? toWallet?.currency : baseCurrency;
          
          // Determine banner color and whether to show manual input
          let bannerColor = 'blue.9';
          let bannerIcon = <IconInfoCircle size={16} />;
          let warningMessage = null;
          let showManualInput = false;
          let requireManualInput = false;
          
          if (severity === 'critical') {
            bannerColor = 'blue.9';
            bannerIcon = <IconInfoCircle size={16} />;
            warningMessage = 'No exchange rate is available for this date.\nPlease enter the exchange rate manually to continue.';
            showManualInput = true;
            requireManualInput = true;
          } else if (severity === 'none' || severity === 'info') {
            bannerColor = 'blue.9';
            bannerIcon = <IconInfoCircle size={16} />;
            showManualInput = false;
          } else if (severity === 'recent') {
            bannerColor = 'blue.9';
            bannerIcon = <IconInfoCircle size={16} />;
            warningMessage = `Using the most recent available exchange rate from ${formattedDate}.\nYou can edit the rate if needed.`;
            showManualInput = true;
          } else if (severity === 'outdated') {
            bannerColor = 'orange.9';
            bannerIcon = <IconAlertTriangle size={16} />;
            warningMessage = `Exchange rate from ${formattedDate} may be outdated.\nYou can edit the rate if you know the correct value.`;
            showManualInput = true;
          } else if (severity === 'old') {
            bannerColor = 'red';
            bannerIcon = <IconAlertTriangle size={16} />;
            warningMessage = `The most recent available exchange rate is from ${formattedDate}.\nThis rate may be outdated.\n\nEnter exchange rate manually:`;
            showManualInput = true;
          }
          
          return (
            <Alert 
              icon={bannerIcon} 
              color={bannerColor}
              c={bannerColor}
              variant="light"
              styles={{
                root: { padding: '12px' },
                message: { fontSize: '13px' }
              }}
            >
              <Stack gap={8}>
                {warningMessage && (
                  <Text size="sm" fw={500} style={{ whiteSpace: 'pre-line' }}>
                    {warningMessage}
                  </Text>
                )}
                
                {/* Explanation Text */}
                {convertedAmount > 0 && (
                  <Text size="xs" style={{ color: 'var(--gray-9)' }}>
                    For totals and reports, this {transactionType} will also be shown in {baseCurrency}.
                  </Text>
                )}
                
                {/* Amount Conversion Display */}
                {convertedAmount > 0 && (
                  <Text size="sm" fw={500} style={{ color: 'var(--gray-11)' }}>
                    Amount: {amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {transactionCurrency} ≈ {convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetCurrency}
                  </Text>
                )}
                
                {!requireManualInput && (
                  <Box>
                    {rateDisplay && (
                      <>
                        <Text size="xs" fw={500} mb={4}>Exchange Rate:</Text>
                        <Text size="xs" style={{ color: 'var(--gray-9)' }}>
                          1 {rateDisplay.from} = {rateDisplay.value.toFixed(4)} {rateDisplay.to}
                        </Text>
                        {rateDisplay.note && (
                          <Text size="xs" style={{ color: 'var(--gray-7)', fontStyle: 'italic' }}>
                            {rateDisplay.note}
                          </Text>
                        )}
                      </>
                    )}
                    {rateDate && (
                      <Text size="xs" style={{ color: 'var(--gray-9)' }} mt={rateDisplay ? 4 : 0}>
                        Rate Date: {formattedDate}
                      </Text>
                    )}
                  </Box>
                )}
                
                {showManualInput && (
                  <Box mt={requireManualInput ? 0 : 4}>
                    {!requireManualInput && (
                      <>
                        <Text size="xs" fw={500} mb={4}>Or enter your own rate (optional):</Text>
                        <NumberInput
                          placeholder={`Enter exchange rate (optional)`}
                          value={manualExchangeRate}
                          onChange={(value) => onManualExchangeRateChange(value)}
                          size="sm"
                          min={0}
                          decimalScale={6}
                          fixedDecimalScale={false}
                          thousandSeparator=","
                          styles={{
                            input: { fontSize: '13px' }
                          }}
                        />
                      </>
                    )}
                    {requireManualInput && (
                      <>
                        <NumberInput
                          placeholder={`1 ${transactionCurrency} = _____ ${targetCurrency}`}
                          value={manualExchangeRate}
                          onChange={(value) => onManualExchangeRateChange(value)}
                          size="sm"
                          min={0}
                          required
                          decimalScale={6}
                          fixedDecimalScale={false}
                          thousandSeparator=","
                          error={!manualExchangeRate || parseFloat(manualExchangeRate) <= 0}
                          styles={{
                            input: { fontSize: '13px' }
                          }}
                        />
                        {manualExchangeRate && parseFloat(manualExchangeRate) > 0 && (
                          <Text size="sm" fw={500} style={{ color: 'var(--gray-11)' }} mt={8}>
                            Amount: {amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {transactionCurrency} ≈ {(amountNum * parseFloat(manualExchangeRate)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetCurrency}
                          </Text>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Stack>
            </Alert>
          );
        })()}

        {/* Merchant - For Expense only */}
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
              onChange={(e) => onMerchantChange(e.target.value)}
              size="md"
              className="text-input"
              maxLength={80}
            />
            <Text size="xs" c="gray.11" ta="right" mt={4}>
              {merchant.length}/80
            </Text>
          </Box>
        )}

        {/* Source/Counterparty - For Income only */}
        {transactionType === 'income' && (
          <Box>
            <TextInput
              label="Source (optional)"
              placeholder="Who paid you?"
              value={counterparty}
              onChange={(e) => onCounterpartyChange(e.target.value)}
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

        {/* Description */}
        <Box>
          <TextInput
            label="Description (optional)"
            placeholder="Add a note about this transaction..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
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

        {/* Submit Button */}
        <Button
          color="blue.9"
          size="md"
          fullWidth
          onMouseDown={createRipple}
          loading={isSubmitting}
          disabled={
            isSubmitting ||
            !amount || 
            !date || 
            dateValidationError ||
            isOverdraftBlocked ||
            (transactionType === 'transfer' && (!fromWalletId || !toWalletId)) ||
            (transactionType !== 'transfer' && !category) || 
            (transactionType !== 'transfer' && !walletId) ||
            (editMode && !hasChanges) ||
            (exchangeRateInfo?.severity === 'critical' && (!manualExchangeRate || parseFloat(manualExchangeRate) <= 0))
          }
          onClick={onSubmit}
          styles={{
            root: {
              position: 'relative',
              overflow: 'hidden'
            }
          }}
        >
          {editMode ? 'Update Transaction' : transferFromWallet ? 'Transfer' : 'Add Transaction'}
        </Button>
      </Stack>
    </Drawer>
  );
};

TransactionDrawer.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired,
  drawerTitle: PropTypes.node.isRequired,
  transactionType: PropTypes.string.isRequired,
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  category: PropTypes.string,
  walletId: PropTypes.string,
  fromWalletId: PropTypes.string,
  toWalletId: PropTypes.string,
  date: PropTypes.instanceOf(Date),
  merchant: PropTypes.string.isRequired,
  counterparty: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  selectedTags: PropTypes.arrayOf(PropTypes.string).isRequired,
  customTags: PropTypes.arrayOf(PropTypes.object).isRequired,
  onTransactionTypeChange: PropTypes.func.isRequired,
  onAmountChange: PropTypes.func.isRequired,
  onAmountBlur: PropTypes.func.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  onWalletIdChange: PropTypes.func.isRequired,
  onFromWalletIdChange: PropTypes.func.isRequired,
  onToWalletIdChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onMerchantChange: PropTypes.func.isRequired,
  onCounterpartyChange: PropTypes.func.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
  onSelectedTagsChange: PropTypes.func.isRequired,
  showTagInput: PropTypes.bool.isRequired,
  setShowTagInput: PropTypes.func.isRequired,
  tagSearchValue: PropTypes.string.isRequired,
  setTagSearchValue: PropTypes.func.isRequired,
  maxTagsReached: PropTypes.bool.isRequired,
  onAddTag: PropTypes.func.isRequired,
  onRemoveCustomTag: PropTypes.func.isRequired,
  quickDateSelection: PropTypes.string,
  onQuickDateSelect: PropTypes.func.isRequired,
  isFutureDate: PropTypes.bool,
  walletsData: PropTypes.object,
  walletsLoading: PropTypes.bool,
  referenceData: PropTypes.object,
  referenceLoading: PropTypes.bool,
  filteredCategories: PropTypes.array.isRequired,
  suggestedTags: PropTypes.array.isRequired,
  availableTagsForSearch: PropTypes.array.isRequired,
  toWalletOptions: PropTypes.array.isRequired,
  amountOverflowWarning: PropTypes.object,
  walletBalanceWarning: PropTypes.object,
  fromWalletBalanceWarning: PropTypes.object,
  maxAllowedAmount: PropTypes.number,
  isOverdraftBlocked: PropTypes.bool.isRequired,
  hasChanges: PropTypes.bool.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  amountInputRef: PropTypes.object,
  createRipple: PropTypes.func.isRequired,
  exchangeRateInfo: PropTypes.object,
  checkingExchangeRate: PropTypes.bool,
  manualExchangeRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onManualExchangeRateChange: PropTypes.func,
  baseCurrency: PropTypes.string,
  transferFromWallet: PropTypes.number,
  fromWalletDisabled: PropTypes.bool,
};

export default TransactionDrawer;
