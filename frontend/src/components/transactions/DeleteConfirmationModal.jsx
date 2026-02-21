import { Modal, Stack, Box, Text, Group, Button, LoadingOverlay } from '@mantine/core';
import PropTypes from 'prop-types';
import { formatCurrency } from '../../data/currencies';

/**
 * DeleteConfirmationModal - Modal for confirming transaction deletion
 * Shows transaction details before deletion
 */
const DeleteConfirmationModal = ({ 
  opened, 
  onClose, 
  transaction, 
  onConfirm, 
  isDeleting 
}) => {
  if (!transaction) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Transaction?"
      centered
      size="sm"
    >
      <Box style={{ position: 'relative' }}>
        <LoadingOverlay 
          visible={isDeleting} 
          zIndex={1000} 
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={500} style={{ color: 'var(--gray-12)' }}>
              {transaction.type === 'transfer' ? (
                <>Transfer - {formatCurrency(Math.abs(transaction.amount), transaction.currency)}</>
              ) : (
                <>
                  {transaction.type === 'income' ? 'Income' : 'Expense'} - {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                  {transaction.category_name && ` (${transaction.category_name})`}
                </>
              )}
            </Text>
            <Text size="xs" c="gray.9" mt={4}>
              {new Date(transaction.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })} - {transaction.type === 'transfer' 
                ? `${transaction.wallet_name}, ${transaction.to_wallet_name}`
                : transaction.wallet_name
              }
            </Text>
            {transaction.description && (
              <Text size="xs" c="gray.9" mt={4}>
                {transaction.description}
              </Text>
            )}
          </Box>

          <Text size="sm" c="gray.11">
            {transaction.type === 'transfer' 
              ? 'This will permanently remove this transfer and update both wallet balances.'
              : 'This will permanently remove this transaction and update your balances and reports.'
            }
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button 
              variant="subtle" 
              color="gray.9"
              c="gray.9"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              color="red.9"
              onClick={onConfirm}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
};

DeleteConfirmationModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  transaction: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool.isRequired,
};

export default DeleteConfirmationModal;
