import AppLayout from '../components/AppLayout';
import { Title, Text, Stack, Group, Loader, Accordion, Box, Avatar, Divider, ActionIcon, Drawer } from '@mantine/core';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/api';
import { WALLET_TYPES } from '../data/walletTypes';
import { IconEdit } from '@tabler/icons-react';
import '../styles/navigation.css';

function Wallets() {
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/onboarding/wallets');
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }
      
      return response.json();
    }
  });

  const handleEditWallet = (wallet) => {
    setSelectedWallet(wallet);
    setDrawerOpened(true);
  };

  return (
    <AppLayout>
      <Box w="50%">
        <Title order={1}>Wallets</Title>
        
        {isLoading && (
          <Group mt="md">
            <Loader size="sm" />
            <Text>Loading wallets...</Text>
          </Group>
        )}
        
        {error && (
          <Text c="red" mt="md">Error: {error.message}</Text>
        )}
        
        {data && (
          <Stack mt="md" gap="md">
            <Text size="lg" fw={600}>
              Total Net Worth: ${data.totalNetWorth.toFixed(2)}
            </Text>
            
            <Accordion 
              variant="separated" 
              defaultValue={data.wallets[0]?.type}
              styles={{
                item: {
                  border: 'none',
                  boxShadow: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05), 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              {WALLET_TYPES.map((walletType) => {
                // Filter wallets by this type
                const walletsOfType = data.wallets.filter(w => w.type === walletType.value);
                
                // Skip if no wallets of this type
                if (walletsOfType.length === 0) return null;
                
                // Calculate total for this type
                const typeTotal = walletsOfType.reduce((sum, w) => sum + parseFloat(w.current_balance), 0);
                
                return (
                  <Accordion.Item key={walletType.value} value={walletType.value}>
                    <Accordion.Control>
                      <Group justify="space-between" pr="md">
                        <Group>
                          <Text size="sm">{walletType.label}</Text>
                          <Text size="sm" c="dimmed">({walletsOfType.length})</Text>
                        </Group>
                        <Text fw={600}>${typeTotal.toFixed(2)}</Text>
                      </Group>
                    </Accordion.Control>
                    <Divider />
                    <Accordion.Panel>
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
                                  <div>
                                    <Text size="sm" fw={500}>{wallet.name}</Text>
                                    <Text size="sm" c="dimmed">{wallet.currency}</Text>
                                  </div>
                                </Group>
                                <Group gap="md">
                                  <div style={{ textAlign: 'right', marginRight: '-6px' }}>
                                    <Text fw={600} size="sm">${wallet.current_balance}</Text>
                                    <Text size="sm" c="dimmed">Starting Balance: ${wallet.starting_balance}</Text>
                                  </div>
                                  <ActionIcon 
                                    variant="subtle" 
                                    radius="sm"
                                    color="gray.11"
                                    className="wallet-edit-icon"
                                    onClick={() => handleEditWallet(wallet)}
                                    style={{
                                      color: `var(--gray-12)`,
                                      marginRight: '-4px'
                                    }}
                                  >
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Group>
                              </Group>
                              {index < walletsOfType.length - 1 && <Divider />}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </Stack>
        )}
      </Box>

      <Drawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        position="right"
        title="Edit Wallet"
        size="md"
      >
        {selectedWallet && (
          <Stack gap="md">
            <Text size="sm">
              Editing: <strong>{selectedWallet.name}</strong>
            </Text>
            <Text size="sm" c="dimmed">
              Type: {selectedWallet.type}
            </Text>
            <Text size="sm" c="dimmed">
              Currency: {selectedWallet.currency}
            </Text>
            <Text size="sm" c="dimmed">
              Current Balance: ${selectedWallet.current_balance}
            </Text>
            {/* TODO: Add edit form here */}
          </Stack>
        )}
      </Drawer>
    </AppLayout>
  );
}

export default Wallets;
