import { useMemo, memo } from 'react';
import { Button, Drawer, Stack, Text, NumberInput, Chip, Group, Select, MultiSelect, Badge, TextInput, Checkbox } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import PropTypes from 'prop-types';
import { formatCurrency, ALL_CURRENCIES } from '../../data/currencies';
import { CountryFlag } from '../CountryFlag';

/**
 * TransactionFilters - Filters button and drawer for advanced transaction filtering
 * Includes transaction type, wallets, categories, tags, amount range, merchant/source, and future transactions
 */
const TransactionFilters = memo(({ 
  // Drawer state
  open,
  onOpen,
  onClose,
  
  // Filter state
  filterTransactionTypes,
  filterWallets,
  filterCategories,
  filterTags,
  filterMinAmount,
  filterMaxAmount,
  filterCounterparty,
  filterIncludeFuture,
  filterCurrencyType,
  filterSelectedCurrency,
  
  // Filter setters
  onTransactionTypesChange,
  onWalletsChange,
  onCategoriesChange,
  onTagsChange,
  onMinAmountChange,
  onMaxAmountChange,
  onCounterpartyChange,
  onIncludeFutureChange,
  onCurrencyTypeChange,
  onSelectedCurrencyChange,
  onClearAllFilters,
  
  // Reference data
  walletsData,
  referenceData,
  
  // Base currency for amount range
  baseCurrency = 'USD'
}) => {
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
    if (filterCurrencyType !== 'all') count += 1;
    return count;
  }, [
    filterTransactionTypes,
    filterWallets,
    filterCategories,
    filterTags,
    filterMinAmount,
    filterMaxAmount,
    filterCounterparty,
    filterIncludeFuture,
    filterCurrencyType
  ]);

  // Get unique currencies from user's wallets (excluding base currency)
  const walletCurrencies = useMemo(() => {
    if (!walletsData?.wallets) return [];
    
    const uniqueCurrencies = [...new Set(
      walletsData.wallets
        .map(w => w.currency)
        .filter(c => c !== baseCurrency)
    )];
    
    return uniqueCurrencies.map(code => {
      const currencyInfo = ALL_CURRENCIES.find(c => c.code === code);
      return {
        value: code,
        label: currencyInfo ? `${currencyInfo.code} - ${currencyInfo.name}` : code,
        countryCode: currencyInfo?.countryCode
      };
    });
  }, [walletsData, baseCurrency]);

  const handleCategoriesChange = (value) => {
    onCategoriesChange(value);
    // If category selected, remove transfer from transaction types
    if (value.length > 0 && filterTransactionTypes.includes('transfer')) {
      onTransactionTypesChange(filterTransactionTypes.filter(t => t !== 'transfer'));
    }
  };

  const handleTagSelect = (value) => {
    if (value && !filterTags.includes(value)) {
      onTagsChange([...filterTags, value]);
    }
  };

  const handleTagRemove = (tagId) => {
    onTagsChange(filterTags.filter(t => t !== tagId));
  };

  const hasAmountRangeError = filterMinAmount !== '' && filterMaxAmount !== '' && parseFloat(filterMinAmount) > parseFloat(filterMaxAmount);

  return (
    <>
      <Button 
        variant="subtle" 
        color="blue.9"
        c="blue.9"
        leftSection={<IconFilter size={18} />}
        size="sm"
        onClick={onOpen}
      >
        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
      </Button>

      <Drawer
        opened={open}
        onClose={onClose}
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
            <Chip.Group multiple value={filterTransactionTypes} onChange={onTransactionTypesChange}>
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
              onChange={onWalletsChange}
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
              data={referenceData?.categories?.filter(cat => 
                !['Initial Balance', 'Balance Adjustment'].includes(cat.name)
              ).map(cat => ({
                value: cat.id,
                label: `${cat.icon} ${cat.name}`
              })) || []}
              value={filterCategories}
              onChange={handleCategoriesChange}
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
              onChange={handleTagSelect}
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
                      onClick={() => handleTagRemove(tagId)}
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
            <Group gap="xs" grow>
              <NumberInput
                placeholder="Min"
                value={filterMinAmount}
                onChange={(value) => onMinAmountChange(value === null ? '' : value)}
                min={0}
                decimalScale={2}
                className="text-input"
                size="sm"
                prefix={`${baseCurrency === 'USD' ? '$' : baseCurrency === 'EUR' ? '€' : baseCurrency} `}
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
                onChange={(value) => onMaxAmountChange(value === null ? '' : value)}
                min={0}
                decimalScale={2}
                className="text-input"
                size="sm"
                prefix={`${baseCurrency === 'USD' ? '$' : baseCurrency === 'EUR' ? '€' : baseCurrency} `}
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
          </div>

          {/* Counterparty/Merchant Search */}
          <div>
            <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
              Merchant / Source
            </Text>
            <TextInput
              placeholder="Search by merchant or source"
              value={filterCounterparty}
              onChange={(e) => onCounterpartyChange(e.target.value)}
              className="text-input"
              size="sm"
            />
            <Text size="xs" c="gray.9" mt={4}>
              Search in merchant and counterparty fields
            </Text>
          </div>

          {/* Currency Filter */}
          <div>
            <Text size="sm" fw={500} mb="xs" style={{ color: 'var(--gray-12)' }}>
              Currency
            </Text>
            <Chip.Group value={filterCurrencyType} onChange={onCurrencyTypeChange}>
              <Group gap="xs">
                <Chip value="all" size="sm" radius="md" color="blue.9">
                  All
                </Chip>
                <Chip value="base" size="sm" radius="md" color="blue.9">
                  {baseCurrency}
                </Chip>
                <Chip value="others" size="sm" radius="md" color="blue.9">
                  Others
                </Chip>
              </Group>
            </Chip.Group>
            
            {/* Currency Dropdown - Shows when "Others" is selected */}
            {filterCurrencyType === 'others' && walletCurrencies.length > 0 && (
              <Select
                placeholder="Select currency"
                value={filterSelectedCurrency}
                onChange={onSelectedCurrencyChange}
                data={[
                  { value: 'all', label: `All (${walletCurrencies.length})` },
                  ...walletCurrencies
                ]}
                size="sm"
                className={filterSelectedCurrency && filterSelectedCurrency !== 'all' ? 'text-input currency-select-with-flag' : 'text-input'}
                clearable
                searchable
                mt="xs"
                maxDropdownHeight={200}
                comboboxProps={{ 
                  position: 'bottom',
                  middlewares: { flip: false, shift: false },
                  withinPortal: true
                }}
                leftSection={
                  filterSelectedCurrency && filterSelectedCurrency !== 'all' ? (
                    <CountryFlag 
                      countryCode={ALL_CURRENCIES.find(c => c.code === filterSelectedCurrency)?.countryCode} 
                      size={16} 
                    />
                  ) : null
                }
                leftSectionPointerEvents="none"
                renderOption={({ option }) => {
                  if (option.value === 'all') {
                    return (
                      <Group gap="xs">
                        <span>{option.label.split(' (')[0]}</span>
                        <Text size="xs" c="gray.9">({walletCurrencies.length})</Text>
                      </Group>
                    );
                  }
                  
                  const currency = walletCurrencies.find(c => c.value === option.value);
                  if (!currency) return option.label;
                  
                  return (
                    <Group gap="xs">
                      <CountryFlag countryCode={currency.countryCode} size={16} />
                      <span>{option.label}</span>
                    </Group>
                  );
                }}
              />
            )}
            
            <Text size="xs" c="gray.9" mt={4}>
              Filter transactions by wallet currency
            </Text>
          </div>

          {/* Include Future Transactions */}
          <div>
            <Checkbox
              label="Include future transactions"
              checked={filterIncludeFuture}
              onChange={(e) => onIncludeFutureChange(e.currentTarget.checked)}
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
            onClick={onClearAllFilters}
          >
            Clear All Filters
          </Button>
        </Stack>
      </Drawer>
    </>
  );
});

TransactionFilters.displayName = 'TransactionFilters';

TransactionFilters.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  filterTransactionTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
  filterWallets: PropTypes.arrayOf(PropTypes.string).isRequired,
  filterCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  filterTags: PropTypes.arrayOf(PropTypes.string).isRequired,
  filterMinAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  filterMaxAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  filterCounterparty: PropTypes.string.isRequired,
  filterIncludeFuture: PropTypes.bool.isRequired,
  filterCurrencyType: PropTypes.string.isRequired,
  filterSelectedCurrency: PropTypes.string,
  onTransactionTypesChange: PropTypes.func.isRequired,
  onWalletsChange: PropTypes.func.isRequired,
  onCategoriesChange: PropTypes.func.isRequired,
  onTagsChange: PropTypes.func.isRequired,
  onMinAmountChange: PropTypes.func.isRequired,
  onMaxAmountChange: PropTypes.func.isRequired,
  onCounterpartyChange: PropTypes.func.isRequired,
  onIncludeFutureChange: PropTypes.func.isRequired,
  onCurrencyTypeChange: PropTypes.func.isRequired,
  onSelectedCurrencyChange: PropTypes.func.isRequired,
  onClearAllFilters: PropTypes.func.isRequired,
  walletsData: PropTypes.object,
  referenceData: PropTypes.object,
  baseCurrency: PropTypes.string,
};

export default TransactionFilters;
