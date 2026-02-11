import AppLayout from '../components/AppLayout';
import { Button, Drawer, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useRipple } from '../hooks/useRipple';

function Transactions() {
  const createRipple = useRipple();
  const [drawerOpened, setDrawerOpened] = useState(false);

  return (
    <AppLayout>
      <Stack gap="md" style={{ position: 'relative', height: '100%' }}>
        {/* Add Transaction Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            leftSection={<IconPlus size={20} />}
            color="blue.9"
            size="md"
            onMouseDown={createRipple}
            onClick={() => setDrawerOpened(true)}
            style={{ minWidth: '180px' }}
          >
            Add Transaction
          </Button>
        </div>

        {/* Drawer */}
        <Drawer
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          position="right"
          title="Add Transaction"
          size="md"
          styles={{
            title: { 
              fontSize: '24px', 
              fontWeight: 700 
            }
          }}
        >
          <Stack gap="lg">
            <Text size="sm" c="gray.11">
              Transaction form will go here
            </Text>
          </Stack>
        </Drawer>
      </Stack>
    </AppLayout>
  );
}

export default Transactions;
