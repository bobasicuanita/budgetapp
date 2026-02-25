import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Text, Stack, Group, Loader, Box, Avatar, Badge, Modal, Button, ActionIcon, Menu, Tooltip } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { IconArchive, IconRestore, IconReceipt, IconDotsVertical } from '@tabler/icons-react';
import { authenticatedFetch } from '../../utils/api';
import { showErrorNotification } from '../../utils/notifications';
import { getWalletTypeLabel } from '../../data/walletTypes';
import { RestoreWalletModal } from './';

// Helper to format currency
const formatWalletBalance = (balance, currency) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(balance);
};

function ArchivedWalletsManager({ 
  trigger, // 'button' or 'custom' - if custom, you control when to open
  onOpenChange, // callback when modal opens/closes
  buttonVariant = 'subtle', // 'subtle' or 'filled'
  buttonText = 'View Archived Wallets'
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [archivedModalOpened, setArchivedModalOpened] = useState(false);
  const [restoreModalOpened, setRestoreModalOpened] = useState(false);
  const [walletToRestore, setWalletToRestore] = useState(null);
  const [archivedWallets, setArchivedWallets] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Fetch archived wallets
  const fetchArchivedWallets = async () => {
    setLoadingArchived(true);
    try {
      const response = await authenticatedFetch('/api/wallets/archived/list');
      if (!response.ok) {
        throw new Error('Failed to fetch archived wallets');
      }
      const data = await response.json();
      setArchivedWallets(data.wallets || []);
    } catch (error) {
      showErrorNotification(error.message);
    } finally {
      setLoadingArchived(false);
    }
  };

  // Open archived wallets modal
  const handleViewArchivedWallets = () => {
    setArchivedModalOpened(true);
    fetchArchivedWallets();
    if (onOpenChange) onOpenChange(true);
  };

  const handleCloseArchivedModal = () => {
    setArchivedModalOpened(false);
    if (onOpenChange) onOpenChange(false);
  };

  const handleRestoreWallet = (wallet) => {
    setWalletToRestore(wallet);
    setRestoreModalOpened(true);
  };

  const handleRestoreSuccess = async () => {
    // Fetch updated archived list
    try {
      const response = await authenticatedFetch('/api/wallets/archived/list');
      if (response.ok) {
        const data = await response.json();
        setArchivedWallets(data.wallets || []);
        
        // Close archived modal if no more archived wallets
        if (data.count === 0) {
          setArchivedModalOpened(false);
          if (onOpenChange) onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error fetching archived wallets:', error);
    }
  };

  return (
    <>
      {trigger === 'button' && (
        <Button
          variant={buttonVariant}
          color="blue.9"
          c="blue.9"
          radius="sm"
          leftSection={<IconArchive size={18} />}
          onClick={handleViewArchivedWallets}
        >
          {buttonText}
        </Button>
      )}

      {/* Archived Wallets Modal */}
      <Modal
        opened={archivedModalOpened}
        onClose={handleCloseArchivedModal}
        title={
          <Group gap="xs">
            <IconArchive size={20} color="var(--blue-9)" />
            <Text size="md" fw={400}>
              Archived Wallets
            </Text>
          </Group>
        }
        size="xl"
        radius="md"
      >
        {loadingArchived ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader size="md" color="var(--blue-9)" />
          </Box>
        ) : archivedWallets.length === 0 ? (
          <Text c="gray.7" ta="center" py="xl">
            No archived wallets found
          </Text>
        ) : (
          <Stack gap="md">
            <Text size="xs" c="gray.9" ta="center">
              Wallets that are no longer active. They don't affect balances or net worth.
            </Text>
            <Text size="sm" c="gray.11" ta="center">
              Archiving keeps your history but removes the wallet from balances and reports.
            </Text>
            <Group gap="sm" align="stretch" justify="center">
            {archivedWallets.map((wallet) => {
              const isImageIcon = wallet.icon && (wallet.icon.startsWith('data:') || wallet.icon.startsWith('http'));
              const initials = wallet.name.substring(0, 2).toUpperCase();
              const formattedBalance = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: wallet.currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(wallet.current_balance);

              return (
                <Box
                  key={wallet.id}
                  style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid var(--gray-4)',
                    boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05), 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.1)',
                    flex: '0 0 calc(50% - 4px)',
                    minWidth: 0
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      {isImageIcon ? (
                        <Box
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          <img
                            src={wallet.icon}
                            alt={wallet.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </Box>
                      ) : (
                        <Avatar
                          radius="md" 
                          size="md"
                          color="white"
                          style={{
                            backgroundColor: `var(--${wallet.color}-9)`,
                            flexShrink: 0
                          }}
                        >
                          {initials}
                        </Avatar>
                      )}
                      <Stack gap={4} style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <Tooltip 
                          label={wallet.name}
                          disabled={wallet.name.length <= 20}
                          withArrow
                        >
                          <Text 
                            fw={500} 
                            size="sm"
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {wallet.name}
                          </Text>
                        </Tooltip>
                        <Group gap={6}>
                          <Text size="xs" c="gray.11">{formattedBalance}</Text>
                          <Badge 
                            size="xs" 
                            color={wallet.color} 
                            variant="light"
                            styles={{
                              root: {
                                backgroundColor: `var(--${wallet.color}-1)`,
                                color: `var(--${wallet.color}-9)`,
                                border: `1px solid var(--${wallet.color}-3)`
                              }
                            }}
                          >
                            {getWalletTypeLabel(wallet.type)}
                          </Badge>
                        </Group>
                        <Text size="xs" c="gray.9">
                          Archived on {new Date(wallet.updated_at).toLocaleDateString()}
                        </Text>
                      </Stack>
                    </Group>
                    <Menu shadow="md" width={200} position="right">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray.11" c="gray.11" style={{ flexShrink: 0 }}>
                          <IconDotsVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconReceipt size={16} />}
                          onClick={() => navigate(`/wallets/${wallet.id}`)}
                        >
                          View Wallet Details
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconRestore size={16} />}
                          onClick={() => handleRestoreWallet(wallet)}
                        >
                          Restore Wallet
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Box>
              );
            })}
            </Group>
            <Group justify="center" mt="lg">
              <Button
                color="blue.9"
                onClick={handleCloseArchivedModal}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Restore Wallet Confirmation Modal */}
      <RestoreWalletModal
        opened={restoreModalOpened}
        onClose={() => {
          setRestoreModalOpened(false);
          setWalletToRestore(null);
        }}
        wallet={walletToRestore}
        onRestoreSuccess={handleRestoreSuccess}
      />
    </>
  );
}

// Export a hook to access the open function imperatively
export const useArchivedWalletsManager = () => {
  const [triggerOpen, setTriggerOpen] = useState(false);
  
  const openArchivedWallets = () => setTriggerOpen(true);
  
  return { openArchivedWallets, triggerOpen, setTriggerOpen };
};

export default ArchivedWalletsManager;
