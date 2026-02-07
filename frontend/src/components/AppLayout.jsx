import { AppShell, Burger, Group, NavLink, Text, Avatar, Stack, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  IconHome, 
  IconWallet, 
  IconChartBar, 
  IconReceipt, 
  IconSettings,
  IconLogout 
} from '@tabler/icons-react';

function AppLayout({ children }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem('accessToken');
      navigate('/login');
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: IconHome, path: '/dashboard' },
    { label: 'Wallets', icon: IconWallet, path: '/wallets' },
    { label: 'Transactions', icon: IconReceipt, path: '/transactions' },
    { label: 'Reports', icon: IconChartBar, path: '/reports' },
    { label: 'Settings', icon: IconSettings, path: '/settings' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <Burger
              opened={desktopOpened}
              onClick={toggleDesktop}
              visibleFrom="sm"
              size="sm"
            />
            <Text fw={700} size="xl" style={{ color: 'var(--blue-9)' }}>
              BudgetApp
            </Text>
          </Group>

          <Group>
            <Avatar radius="xl" size="sm" />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <Stack gap="xs">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<item.icon size={20} stroke={1.5} />}
                active={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  toggleMobile(); // Close mobile menu after navigation
                }}
                style={{
                  borderRadius: '8px',
                }}
              />
            ))}
          </Stack>

          <Box>
            <NavLink
              label="Logout"
              leftSection={<IconLogout size={20} stroke={1.5} />}
              onClick={handleLogout}
              style={{
                borderRadius: '8px',
              }}
              color="red"
            />
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
