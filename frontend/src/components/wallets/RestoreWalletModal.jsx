import { Modal, Stack, Group, Text, Button, Alert } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../../utils/api';
import { showSuccessNotification, showErrorNotification } from '../../utils/notifications';
import { getWalletTypeLabel } from '../../data/walletTypes';

function RestoreWalletModal({ opened, onClose, wallet, onRestoreSuccess }) {
  const queryClient = useQueryClient();

  const restoreWalletMutation = useMutation({
    mutationFn: async (walletId) => {
      const response = await authenticatedFetch(`/api/wallets/${walletId}/restore`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore wallet');
      }

      return response.json();
    },
    onSuccess: async (data, walletId) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      showSuccessNotification('Wallet restored successfully');
      onClose();
      
      if (onRestoreSuccess) {
        onRestoreSuccess();
      }
    },
    onError: (error) => {
      showErrorNotification(error.message);
    }
  });

  const handleConfirmRestore = () => {
    if (wallet) {
      restoreWalletMutation.mutate(wallet.id);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600}>
          Restore Wallet?
        </Text>
      }
      size="md"
      radius="md"
    >
      {wallet && (
        <Stack gap="md">
          {/* Wallet Details */}
          <Stack gap={4}>
            <Group gap={8}>
              <Text size="sm" fw={500}>Wallet:</Text>
              <Text size="sm">{wallet.name}</Text>
            </Group>
            <Group gap={8}>
              <Text size="sm" fw={500}>Currency:</Text>
              <Text size="sm">{wallet.currency}</Text>
            </Group>
            <Group gap={8}>
              <Text size="sm" fw={500}>Type:</Text>
              <Text size="sm">{getWalletTypeLabel(wallet.type)}</Text>
            </Group>
            <Text size="xs" c="gray.9" mt={4}>
              Archived on {new Date(wallet.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </Stack>

          {/* Description */}
          <Text size="sm" c="gray.11">
            This wallet will become active again and will be included in your balances and reports.
          </Text>

          {/* Info Banner */}
          <Alert 
            color="blue"
            c="blue"
            variant="light"
            styles={{
              root: { padding: '12px' },
              message: { fontSize: '13px' }
            }}
          >
            <Text component="ul" size="xs" style={{ margin: 0, paddingLeft: '20px' }}>
              <li>The wallet will appear in your wallet list</li>
              <li>Its balance will affect your net worth</li>
              <li>Its transactions will be included in totals</li>
            </Text>
          </Alert>

          {/* Note */}
          <Text size="xs" c="gray.9">
            No transactions will be changed or deleted
          </Text>

          {/* Action Buttons */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="subtle"
              color="gray.9"
              c="gray.9"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              color="blue.9"
              onClick={handleConfirmRestore}
              loading={restoreWalletMutation.isPending}
            >
              Restore Wallet
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export default RestoreWalletModal;
