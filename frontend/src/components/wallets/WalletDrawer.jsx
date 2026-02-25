import { Drawer, Stack, Text, TextInput, Select, NumberInput, Box, Checkbox, Image, Button, Group, Divider } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconArchive, IconAlertTriangle, IconUpload, IconX, IconPhoto, IconEdit, IconWallet } from '@tabler/icons-react';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../../utils/api';
import { showSuccessNotification, showErrorNotification } from '../../utils/notifications';
import { WALLET_TYPES } from '../../data/walletTypes';
import { GROUPED_CURRENCY_OPTIONS, ALL_CURRENCIES, getCurrencySymbol } from '../../data/currencies';
import { CountryFlag } from '../CountryFlag';
import { getCurrencyDecimals, getCurrencyDecimalInfo, getMaxAmountDisplay, exceedsMaxAmount, getMaxAmountString } from '../../utils/amountValidation';
import { useRipple } from '../../hooks/useRipple';
import '../../styles/inputs.css';

function WalletDrawer({ 
  opened, 
  onClose, 
  selectedWallet = null, // null for add mode, wallet object for edit mode
  onArchiveWallet, // callback when archive wallet button is clicked
  baseCurrency = null // default currency for new wallets
}) {
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  
  // Form state
  const [newWalletType, setNewWalletType] = useState(null);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletCurrency, setNewWalletCurrency] = useState(null);
  const [newWalletBalance, setNewWalletBalance] = useState(0);
  const [newWalletIcon, setNewWalletIcon] = useState('');
  const [walletIconPreview, setWalletIconPreview] = useState(false);
  const [includeInBalance, setIncludeInBalance] = useState(true);
  const [originalWalletValues, setOriginalWalletValues] = useState(null);

  // Populate form when selectedWallet changes (edit mode)
  useEffect(() => {
    if (selectedWallet && opened) {
      setOriginalWalletValues({
        type: selectedWallet.type,
        name: selectedWallet.name,
        currency: selectedWallet.currency,
        starting_balance: selectedWallet.starting_balance,
        icon: selectedWallet.icon,
        include_in_balance: selectedWallet.include_in_balance
      });
      setNewWalletType(selectedWallet.type);
      setNewWalletName(selectedWallet.name);
      setNewWalletCurrency(selectedWallet.currency);
      setNewWalletBalance(selectedWallet.starting_balance);
      setNewWalletIcon(selectedWallet.icon || '');
      // Only show preview if icon is an image (base64 or URL), not an emoji or empty
      setWalletIconPreview((selectedWallet.icon && (selectedWallet.icon.startsWith('data:image') || selectedWallet.icon.startsWith('http'))) ? selectedWallet.icon : false);
      setIncludeInBalance(selectedWallet.include_in_balance);
    } else if (!opened) {
      // Reset form when drawer closes
      setNewWalletType(null);
      setNewWalletName('');
      setNewWalletCurrency(baseCurrency);
      setNewWalletBalance(0);
      setNewWalletIcon('');
      setWalletIconPreview(false);
      setIncludeInBalance(true);
      setOriginalWalletValues(null);
    }
  }, [selectedWallet, opened, baseCurrency]);

  // Create wallet mutation
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
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccessNotification('Wallet created successfully');
      onClose();
    },
    onError: (error) => {
      console.error('Error creating wallet:', error);
      showErrorNotification(error.message);
    }
  });

  // Update wallet mutation
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
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccessNotification('Wallet updated successfully');
      onClose();
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

  // Handle icon file upload
  const handleIconUpload = (files) => {
    if (files && files.length > 0) {
      const file = files[0];

      // Check file size (500KB max)
      const maxSize = 500 * 1024; // 500KB in bytes
      if (file.size > maxSize) {
        showErrorNotification('File size must be less than 500KB');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setWalletIconPreview(reader.result);
        setNewWalletIcon(reader.result); // Store base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconRemove = () => {
    setWalletIconPreview(false);
    setNewWalletIcon('');
  };

  // Check if wallet values have changed from original
  const hasWalletChanged = () => {
    if (!originalWalletValues) return true; // If no original values, allow save (creating new wallet)

    return (
      newWalletType !== originalWalletValues.type ||
      newWalletName !== originalWalletValues.name ||
      newWalletCurrency !== originalWalletValues.currency ||
      newWalletBalance !== originalWalletValues.starting_balance ||
      newWalletIcon !== (originalWalletValues.icon || '') ||
      includeInBalance !== originalWalletValues.include_in_balance
    );
  };

  const handleSubmit = () => {
    if (selectedWallet) {
      // Update existing wallet
      updateWalletMutation.mutate({
        id: selectedWallet.id,
        walletData: {
          type: newWalletType,
          name: newWalletName || undefined,
          currency: newWalletCurrency,
          starting_balance: newWalletBalance,
          icon: newWalletIcon === '' ? null : newWalletIcon,
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
        icon: newWalletIcon || undefined,
        include_in_balance: includeInBalance
      });
    }
  };

  const isSubmitDisabled = 
    !newWalletType || 
    !newWalletCurrency || 
    (selectedWallet && !hasWalletChanged()) || 
    createWalletMutation.isPending || 
    updateWalletMutation.isPending ||
    exceedsMaxAmount(newWalletBalance, newWalletCurrency);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      title={
        selectedWallet ? (
          <Group gap="xs">
            <IconEdit size={20} color="var(--blue-9)" />
            <Text>Edit Wallet</Text>
          </Group>
        ) : (
          <Group gap="xs">
            <IconWallet size={20} color="var(--blue-9)" />
            <Text>Add New Wallet</Text>
          </Group>
        )
      }
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
            if (!isSubmitDisabled) {
              e.preventDefault();
              handleSubmit();
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
          disabled={selectedWallet && selectedWallet.has_user_transactions}
          styles={{
            label: { fontSize: '12px', fontWeight: 500 }
          }}
        />
          
        {selectedWallet && selectedWallet.has_user_transactions && (
          <Text size="xs" c="gray.9" mt={-4}>
            Wallet type can&apos;t be changed after transactions are added.
            <br />
            This keeps your transaction history accurate.
          </Text>
        )}

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
          disabled={selectedWallet && selectedWallet.has_user_transactions}
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
          
        {selectedWallet && selectedWallet.has_user_transactions && (
          <Text size="xs" c="gray.9" mt={-4}>
            Currency cannot be changed after transactions exist.
            <br />
            Create a new wallet if you need a different currency.
          </Text>
        )}
          
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
            label="Available for spending"
            checked={includeInBalance}
            onChange={(event) => setIncludeInBalance(event.currentTarget.checked)}
            size="sm"
            color="blue.8"
          />
          <Text size="xs" c="gray.9" mt={4} ml={28}>
            Used to calculate how much money you have available to spend.
          </Text>
        </Box>
          
        <Box>
          <Text size="xs" fw={500} mb={8}>Wallet Icon (Optional)</Text>
          {walletIconPreview ? (
            <Box>
              <Group gap="md" align="center">
                <Box
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--gray-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--gray-1)'
                  }}
                >
                  <Image
                    src={walletIconPreview}
                    alt="Wallet icon"
                    fit="contain"
                    width={64}
                    height={64}
                  />
                </Box>
                <Button
                  variant="subtle"
                  color="gray.11"
                  c="gray.11"
                  size="sm"
                  leftSection={<IconX size={16} />}
                  onClick={handleIconRemove}
                >
                  Remove
                </Button>
              </Group>
            </Box>
          ) : (
            <Dropzone
              onDrop={handleIconUpload}
              onReject={() => showErrorNotification('Invalid file type or size')}
              maxSize={500 * 1024}
              accept={['image/svg+xml', 'image/png', 'image/jpeg']}
              multiple={false}
              styles={{
                root: {
                  borderRadius: '8px',
                  borderColor: 'var(--gray-4)',
                  backgroundColor: 'var(--gray-0)',
                  '&:hover': {
                    backgroundColor: 'var(--gray-1)',
                    borderColor: 'var(--blue-5)'
                  }
                }
              }}
            >
              <Group justify="center" gap="md" style={{ minHeight: 120, pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={50} stroke={1.5} color="var(--blue-6)" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={50} stroke={1.5} color="var(--red-6)" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto size={50} stroke={1.5} color="var(--gray-6)" />
                </Dropzone.Idle>

                <div>
                  <Text size="md" inline c="gray.9" fw={500}>
                    Drag an image here or click to select
                  </Text>
                  <Text size="xs" c="gray.7" inline mt={7}>
                    SVG, PNG, or JPEG (max 500KB)
                  </Text>
                </div>
              </Group>
            </Dropzone>
          )}
        </Box>
          
        <Button
          color="blue.9"
          size="md"
          fullWidth
          onMouseDown={createRipple}
          disabled={isSubmitDisabled}
          loading={createWalletMutation.isPending || updateWalletMutation.isPending}
          onClick={handleSubmit}
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
              onClick={() => onArchiveWallet(selectedWallet)}
            >
              Archive Wallet
            </Button>
          </>
        )}
      </Stack>
    </Drawer>
  );
}

WalletDrawer.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedWallet: PropTypes.object,
  onArchiveWallet: PropTypes.func.isRequired,
  baseCurrency: PropTypes.string
};

export default WalletDrawer;
