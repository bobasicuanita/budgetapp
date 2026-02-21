import { useParams, useNavigate } from 'react-router-dom';
import { Text, Stack, Group, Button, Breadcrumbs, Anchor, Loader, Box, Modal, NumberInput, TextInput, Badge, Alert } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconAdjustments, IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { useWallets } from '../hooks/useWallets';
import { useRipple } from '../hooks/useRipple';
import { authenticatedFetch } from '../utils/api';
import { formatCurrency, getCurrencySymbol } from '../data/currencies';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { getCurrencyDecimals, validateCurrencyAmount, getMaxAmountDisplay, exceedsMaxAmount, getMaxAmountString } from '../utils/amountValidation';

function WalletDetails() {
  const { walletId } = useParams();
  const navigate = useNavigate();
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  const { data, isLoading } = useWallets();
  
  // Adjust balance modal state
  const [adjustModalOpened, setAdjustModalOpened] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(new Date());
  const [reason, setReason] = useState('');

  // Find the wallet from the list
  const wallet = data?.wallets?.find(w => w.id === parseInt(walletId));
  
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
        <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Loader size="lg" color="blue" />
        </Box>
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
            color="gray"
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
        {/* Back Button */}
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/wallets')}
          size="sm"
          color="gray"
          style={{ alignSelf: 'flex-start' }}
        >
          Back to Wallets
        </Button>

        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor 
            onClick={() => navigate('/wallets')} 
            style={{ cursor: 'pointer', color: 'var(--gray-7)' }}
          >
            Wallets
          </Anchor>
          <Text style={{ color: 'var(--gray-12)' }}>{wallet.name}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group justify="space-between" align="center">
          <Text size="xl" fw={600} style={{ color: 'var(--gray-12)' }}>
            {wallet.name}
          </Text>
          
          <Button
            color="blue"
            style={{ backgroundColor: 'var(--blue-9)' }}
            size="md"
            leftSection={<IconAdjustments size={18} />}
            onMouseDown={createRipple}
            onClick={handleOpenAdjustModal}
          >
            Adjust Balance
          </Button>
        </Group>

        {/* Placeholder Content */}
        <Box
          p="xl"
          style={{
            backgroundColor: 'var(--gray-1)',
            borderRadius: '8px',
            border: '1px solid var(--gray-3)'
          }}
        >
          <Text size="sm" style={{ color: 'var(--gray-7)' }}>
            Wallet details content will be implemented here...
          </Text>
        </Box>
      </Stack>
      
      {/* Adjust Balance Modal */}
      <Modal
        opened={adjustModalOpened}
        onClose={handleCloseAdjustModal}
        title="Correct wallet balance"
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
          <Text size="sm" style={{ color: 'var(--gray-9)' }}>
            Use this <strong>if</strong> the wallet balance is incorrect. This will not affect income or expenses.
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
                <Badge size="xs" variant="light" color="blue">
                  Recommended
                </Badge>
              </Group>
            }
            placeholder="e.g., Forgot to record cash transactions"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={80}
          />
          
          {/* Warning Banner */}
          <Alert 
            color="yellow" 
            icon={<IconAlertTriangle size={16} />}
            styles={{
              root: {
                backgroundColor: 'var(--yellow-0)',
                border: '1px solid var(--yellow-3)'
              },
              icon: {
                color: 'var(--yellow-9)'
              },
              message: {
                color: 'var(--gray-12)'
              }
            }}
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
    </AppLayout>
  );
}

export default WalletDetails;
