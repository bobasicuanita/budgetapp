import { Modal, Stack, Text, Group, Button } from '@mantine/core';
import PropTypes from 'prop-types';

function ArchiveWalletModal({ 
  opened, 
  onClose, 
  wallet, 
  onConfirm, 
  isLoading 
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600}>
          Archive Wallet?
        </Text>
      }
      size="md"
      radius="md"
    >
      {wallet && (
        <Stack gap="md">
          <Text size="sm">
            This wallet will be hidden from your active wallets and excluded from your available balance.
          </Text>

          <Text size="sm">
            Transactions will <span style={{ fontWeight: 'bold' }}>not</span> be deleted.
          </Text>

          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="subtle"
              color="gray.11"
              c="gray.11"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              color="gray.9"
              onClick={onConfirm}
              loading={isLoading}
            >
              Archive Wallet
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

ArchiveWalletModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  wallet: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default ArchiveWalletModal;
