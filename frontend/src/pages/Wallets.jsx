import AppLayout from '../components/AppLayout';
import { Text, Stack, Group, Loader, Accordion, Box, Avatar, Divider, ActionIcon, Drawer, Button, Menu, Select, TextInput, NumberInput, Checkbox, Badge, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/api';
import { WALLET_TYPES } from '../data/walletTypes';
import { formatCurrency, getCurrencySymbol, GROUPED_CURRENCY_OPTIONS, ALL_CURRENCIES } from '../data/currencies';
import { IconEdit, IconPlus, IconDotsVertical, IconArrowsExchange, IconReceipt, IconArchive, IconAlertTriangle } from '@tabler/icons-react';
import { useRipple } from '../hooks/useRipple';
import { useWallets } from '../hooks/useWallets';
import { CountryFlag } from '../components/CountryFlag';
import { getCurrencyDecimals, getCurrencyDecimalInfo, getMaxAmountDisplay, exceedsMaxAmount, getMaxAmountString } from '../utils/amountValidation';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import '../styles/navigation.css';
import '../styles/inputs.css';

function Wallets() {
  const navigate = useNavigate();
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [originalWalletValues, setOriginalWalletValues] = useState(null);
  
  // New wallet form state
  const [newWalletType, setNewWalletType] = useState(null);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletCurrency, setNewWalletCurrency] = useState(null);
  const [newWalletBalance, setNewWalletBalance] = useState(0);
  const [includeInBalance, setIncludeInBalance] = useState(true);

  const { data, isLoading, error } = useWallets();

  const createWalletMutation = useMutation({
    mutationFn: async (walletData) => {
      const response = await authenticatedFetch('/api/wallets', {
        method: 'POST',
        body: JSON.stringify(walletData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create wallet');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch wallets and transactions
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Show success notification
      showSuccessNotification('Wallet created successfully');
      
      // Close drawer and reset form
      handleCloseDrawer();
    },
    onError: (error) => {
      console.error('Error creating wallet:', error);
      showErrorNotification(error.message);
    }
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, walletData }) => {
      const response = await authenticatedFetch(`/api/wallets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(walletData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update wallet');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch wallets and transactions
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Show success notification
      showSuccessNotification('Wallet updated successfully');
      
      // Close drawer and reset form
      handleCloseDrawer();
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

  const handleEditWallet = (wallet) => {
    setSelectedWallet(wallet);
    // Store original values for comparison
    const originalValues = {
      type: wallet.type,
      name: wallet.name,
      currency: wallet.currency,
      starting_balance: wallet.starting_balance,
      include_in_balance: wallet.include_in_balance
    };
    setOriginalWalletValues(originalValues);
    // Populate form with current wallet values
    setNewWalletType(wallet.type);
    setNewWalletName(wallet.name);
    setNewWalletCurrency(wallet.currency);
    setNewWalletBalance(wallet.starting_balance);
    setIncludeInBalance(wallet.include_in_balance);
    setDrawerOpened(true);
  };

  const handleAddWallet = () => {
    setSelectedWallet(null); // null indicates we're adding, not editing
    setOriginalWalletValues(null); // Reset original values
    // Reset form and set currency to user's base currency
    setNewWalletType(null);
    setNewWalletName('');
    setNewWalletCurrency(data?.baseCurrency || null);
    setNewWalletBalance(0);
    setIncludeInBalance(true);
    setDrawerOpened(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpened(false);
    setSelectedWallet(null);
    setOriginalWalletValues(null);
    // Reset form
    setNewWalletType(null);
    setNewWalletName('');
    setNewWalletCurrency(null);
    setNewWalletBalance(0);
    setIncludeInBalance(true);
  };

  // Check if wallet values have changed from original
  const hasWalletChanged = () => {
    if (!originalWalletValues) return true; // If no original values, allow save (creating new wallet)
    
    return (
      newWalletType !== originalWalletValues.type ||
      newWalletName !== originalWalletValues.name ||
      newWalletCurrency !== originalWalletValues.currency ||
      newWalletBalance !== originalWalletValues.starting_balance ||
      includeInBalance !== originalWalletValues.include_in_balance
    );
  };

  return (
    <AppLayout>
      <Box w="100%">
        <Group justify="flex-end">
          <Button
            color="blue.9"
            radius="sm"
            leftSection={<IconPlus size={18} />}
            onMouseDown={createRipple}
            onClick={handleAddWallet}
            w={200}
          >
            Add Wallet
          </Button>
        </Group>

        {isLoading && (
          <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <Loader size="lg" color="var(--blue-9)" />
          </Box>
        )}
        
        {error && (
          <Text c="red" mt="md">Error: {error.message}</Text>
        )}
        
        {data && (
          <Stack gap="md">
            {data.wallets.some(w => w.currency !== data.baseCurrency) ? (
              <Text size="lg" fw={600}>
                Total Net Worth{' '}
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
                  <Text component="span" style={{ cursor: 'help' }}>
                    <Text component="span" style={{ color: 'var(--gray-9)' }}>≈</Text> {formatCurrency(data.totalNetWorth, data.baseCurrency)}
                  </Text>
                </Tooltip>
              </Text>
            ) : (
              <Text size="lg" fw={600}>
                Total Net Worth: {formatCurrency(data.totalNetWorth, data.baseCurrency)}
              </Text>
            )}
            
            <Group gap="md" align="flex-start" wrap="nowrap">
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
                    w="33%"
                    variant="separated"
                    defaultValue={walletType.value}
                    chevron={null}
                    styles={{
                      item: {
                        border: 'none',
                        boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05), 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.1)'
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
                              <Text fw={600} style={{ marginRight: '12px', cursor: 'help', pointerEvents: 'auto' }}>
                                <Text component="span" style={{ color: 'var(--gray-9)' }}>≈ </Text>
                                {formatCurrency(typeTotal, typeCurrency)}
                              </Text>
                            </Tooltip>
                          ) : (
                            <Text fw={600} style={{ marginRight: '12px' }}>
                              {formatCurrency(typeTotal, typeCurrency)}
                            </Text>
                          )}
                        </Group>
                      </Accordion.Control>
                      <Divider />
                      <Accordion.Panel>
                      <Box style={{ height: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
                        <Stack gap={0}>
                          {walletsOfType.map((wallet, index) => {
                          // Get first letter of first two words
                          const words = wallet.name.split(' ');
                          const initials = (words[0]?.charAt(0) || '') + (words[1]?.charAt(0) || '');
                          
                          return (
                            <Box key={wallet.id}>
                              <Group justify="space-between" py="md">
                                <Group>
                                  <Avatar 
                                    radius="md" 
                                    size="md"
                                    color="white"
                                    style={{
                                      backgroundColor: `var(--${wallet.color}-9)`,
                                    }}
                                  >
                                    {initials}
                                  </Avatar>
                                  <div style={{ maxWidth: '250px' }}>
                                    <Group gap="xs">
                                      <Tooltip 
                                        label={wallet.name}
                                        disabled={wallet.name.length <= 18}
                                        withArrow
                                      >
                                        <Text 
                                          size="sm" 
                                          fw={500}
                                          style={{
                                            maxWidth: '18ch',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}
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
                                          mt="4px"
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
                                    </Group>
                                    <Text size="sm" c="gray.9">{wallet.currency}</Text>
                                  </div>
                                </Group>
                                <Group gap="md">
                                  <div style={{ textAlign: 'right', marginRight: '-6px' }}>
                                    <Text fw={600} size="sm">{formatCurrency(wallet.current_balance, wallet.currency)}</Text>
                                    <Text size="sm" c="gray.9">{formatCurrency(wallet.starting_balance, wallet.currency)}</Text>
                                  </div>
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
                                        onClick={() => {
                                          // TODO: Handle transfer money
                                          console.log('Transfer money for wallet:', wallet.id);
                                        }}
                                      >
                                        Transfer Money
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
                              </Group>
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
            </Group>
          </Stack>
        )}
      </Box>

      <Drawer
        opened={drawerOpened}
        onClose={handleCloseDrawer}
        position="right"
        title={selectedWallet ? "Edit Wallet" : "Add New Wallet"}
        size="md"
        styles={{
          title: {
            fontSize: '24px',
            fontWeight: 700
          }
        }}
      >
        <Stack 
          gap="lg"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              // Check if submit button would be disabled
              const isDisabled = 
                !newWalletType || 
                !newWalletCurrency || 
                (selectedWallet && !hasWalletChanged()) || 
                createWalletMutation.isPending || 
                updateWalletMutation.isPending ||
                exceedsMaxAmount(newWalletBalance, newWalletCurrency);
              
              if (!isDisabled) {
                e.preventDefault();
                if (selectedWallet) {
                  updateWalletMutation.mutate({
                    id: selectedWallet.id,
                    walletData: {
                      type: newWalletType,
                      name: newWalletName || undefined,
                      currency: newWalletCurrency,
                      starting_balance: newWalletBalance,
                      include_in_balance: includeInBalance
                    }
                  });
                } else {
                  createWalletMutation.mutate({
                    type: newWalletType,
                    name: newWalletName || undefined,
                    currency: newWalletCurrency,
                    starting_balance: newWalletBalance,
                    include_in_balance: includeInBalance
                  });
                }
              }
            }
          }}
        >
          <Text size="sm" c="gray.11">
            {selectedWallet ? "Edit your wallet details below" : "Create a new wallet to track your money"}
          </Text>
            
            <TextInput
              label="Wallet Name (Optional)"
              placeholder="e.g., Main Checking"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              className="text-input"
              size="md"
              autoFocus
              data-autofocus
              maxLength={50}
              styles={{
                label: { fontSize: '12px', fontWeight: 500 }
              }}
            />
            
            <Select
              label="Wallet Type"
              placeholder="Select wallet type"
              value={newWalletType}
              onChange={setNewWalletType}
              data={WALLET_TYPES}
              size="md"
              clearable
              className="text-input"
              styles={{
                label: { fontSize: '12px', fontWeight: 500 }
              }}
            />
            
            <Select
              label="Currency"
              placeholder="Select currency"
              value={newWalletCurrency}
              onChange={setNewWalletCurrency}
              data={GROUPED_CURRENCY_OPTIONS}
              searchable
              clearable
              size="md"
              className={newWalletCurrency ? 'text-input currency-select-with-flag' : 'text-input'}
              maxDropdownHeight={200}
              comboboxProps={{ 
                position: 'bottom',
                middlewares: { flip: false, shift: false },
                withinPortal: true
              }}
              onSearchChange={(query) => {
                // Clear selection if user manually erases all text
                if (query === '' && newWalletCurrency) {
                  setNewWalletCurrency(null);
                }
              }}
              leftSection={
                newWalletCurrency ? (
                  <CountryFlag 
                    countryCode={ALL_CURRENCIES.find(c => c.code === newWalletCurrency)?.countryCode} 
                    size={16} 
                  />
                ) : null
              }
              leftSectionPointerEvents="none"
              styles={{
                label: { fontSize: '12px', fontWeight: 500 },
                groupLabel: { color: '#687076' }
              }}
              renderOption={({ option }) => (
                <Group gap="xs">
                  <CountryFlag countryCode={option.countryCode} size={16} />
                  <span>{option.label}</span>
                </Group>
              )}
            />
            
            <NumberInput
              label="Starting Balance (Optional)"
              placeholder={newWalletCurrency ? (getCurrencyDecimals(newWalletCurrency) === 0 ? "0" : "0." + "0".repeat(getCurrencyDecimals(newWalletCurrency))) : "0.00"}
              value={newWalletBalance}
              onChange={setNewWalletBalance}
              onBlur={(e) => {
                // Get the raw string value from the input to avoid floating point precision loss
                const rawValue = e.target.value?.replace(/,/g, '').replace(/[^\d.]/g, '');
                
                // Auto-correct to max if exceeded (check raw string value)
                if (rawValue && newWalletCurrency && exceedsMaxAmount(rawValue, newWalletCurrency)) {
                  setNewWalletBalance(getMaxAmountString(newWalletCurrency));
                }
              }}
              decimalScale={newWalletCurrency ? getCurrencyDecimals(newWalletCurrency) : 2}
              fixedDecimalScale={newWalletCurrency ? getCurrencyDecimals(newWalletCurrency) > 0 : true}
              thousandSeparator=","
              min={0}
              size="md"
              className="text-input"
              prefix={newWalletCurrency ? getCurrencySymbol(newWalletCurrency) + ' ' : ''}
              disabled={selectedWallet && selectedWallet.has_user_transactions}
              styles={{
                label: { fontSize: '12px', fontWeight: 500 }
              }}
            />
            
            {/* Currency decimal info message */}
            {(() => {
              const decimalInfo = newWalletCurrency ? getCurrencyDecimalInfo(newWalletCurrency) : null;
              const hasValue = newWalletBalance && parseFloat(newWalletBalance) > 0;
              return decimalInfo && hasValue ? (
                <Text size="xs" c="gray.9" style={{ marginTop: '-8px' }}>
                  {decimalInfo}
                </Text>
              ) : null;
            })()}
            
            {/* Balance overflow warning */}
            {(() => {
              if (!newWalletBalance || !newWalletCurrency) return null;
              return exceedsMaxAmount(newWalletBalance, newWalletCurrency) ? (
                <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px' }}>
                  <IconAlertTriangle size={16} color="var(--red-9)" style={{ flexShrink: 0 }} />
                  <Text size="xs" c="red.9">
                    Balance exceeds maximum allowed amount of {getMaxAmountDisplay(newWalletCurrency)}
                  </Text>
                </Group>
              ) : null;
            })()}
            
            {/* Edit mode warning: Cannot edit initial balance when wallet has transactions */}
            {selectedWallet && selectedWallet.has_user_transactions && (
              <Text size="xs" style={{ color: 'var(--gray-9)', marginTop: '-8px' }}>
                Cannot edit initial balance for a wallet with existing transactions. Use the 'Adjust Balance' feature instead.
              </Text>
            )}
            
            <Box>
              <Checkbox
                label="Include in available balance"
                checked={includeInBalance}
                onChange={(event) => setIncludeInBalance(event.currentTarget.checked)}
                size="sm"
                color="blue.8"
              />
              <Text size="xs" c="gray.9" mt={4} ml={28}>
                Used to calculate how much money you have available to spend.
              </Text>
            </Box>
            
            <Button
              color="blue.9"
              size="md"
              fullWidth
              onMouseDown={createRipple}
              disabled={
                !newWalletType || 
                !newWalletCurrency || 
                (selectedWallet && !hasWalletChanged()) || 
                createWalletMutation.isPending || 
                updateWalletMutation.isPending ||
                exceedsMaxAmount(newWalletBalance, newWalletCurrency)
              }
              loading={createWalletMutation.isPending || updateWalletMutation.isPending}
              onClick={() => {
                if (selectedWallet) {
                  // Update existing wallet
                  updateWalletMutation.mutate({
                    id: selectedWallet.id,
                    walletData: {
                      type: newWalletType,
                      name: newWalletName || undefined,
                      currency: newWalletCurrency,
                      starting_balance: newWalletBalance,
                      include_in_balance: includeInBalance
                    }
                  });
                } else {
                  // Create new wallet
                  createWalletMutation.mutate({
                    type: newWalletType,
                    name: newWalletName || undefined,
                    currency: newWalletCurrency,
                    starting_balance: newWalletBalance,
                    include_in_balance: includeInBalance
                  });
                }
              }}
            >
              {selectedWallet ? 'Save Changes' : 'Create Wallet'}
            </Button>

            {selectedWallet && (
              <>
                <Divider />
                <Button
                  variant="outline"
                  color="gray.11"
                  size="md"
                  fullWidth
                  leftSection={<IconArchive size={18} />}
                  onClick={() => {
                    modals.openConfirmModal({
                      title: 'Archive Wallet?',
                      children: (
                        <Text size="sm">
                          This wallet will be hidden from your active wallets and excluded from your available balance.
                          <br />
                          <br />
                          Transactions will not be deleted.
                        </Text>
                      ),
                      labels: { confirm: 'Archive Wallet', cancel: 'Cancel' },
                      confirmProps: { color: 'gray.9' },
                      onConfirm: () => {
                        // TODO: Implement archive wallet API call
                        console.log('Archive wallet:', selectedWallet.id);
                      },
                    });
                  }}
                >
                  Archive Wallet
                </Button>
              </>
            )}
          </Stack>
      </Drawer>
    </AppLayout>
  );
}

export default Wallets;
