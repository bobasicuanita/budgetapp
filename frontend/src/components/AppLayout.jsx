import { AppShell, Group, NavLink, Text, Stack, Box, Menu, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  IconHome, 
  IconWallet, 
  IconChartBar, 
  IconReceipt, 
  IconSettings,
  IconLogout,
  IconUser,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMenu2,
  IconBell
} from '@tabler/icons-react';
import '../styles/navigation.css';

function AppLayout({ children }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Get current page name from path
  const getPageName = () => {
    const pathMap = {
      '/dashboard': 'Dashboard',
      '/wallets': 'Wallets',
      '/transactions': 'Transactions',
      '/reports': 'Reports',
      '/settings': 'Settings',
      '/profile': 'Profile'
    };
    return pathMap[location.pathname] || 'Dashboard';
  };

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
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: 'var(--blue-2)'
        },
        header: {
          backgroundColor: 'var(--blue-2)',
          borderBottom: '1px solid var(--gray-4)'
        },
        navbar: {
          backgroundColor: 'var(--blue-2)',
          borderRight: '1px solid var(--gray-4)'
        }
      }}
    >
      <AppShell.Header>
        <Group h="100%" pl="md" pr="md" justify="space-between">
          <Group gap="sm">
            <ActionIcon
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="lg"
              variant="subtle"
              className="sidebar-toggle-icon"
              style={{ color: 'var(--gray-11)' }}
            >
              <IconMenu2 size={20} />
            </ActionIcon>
            <ActionIcon
              onClick={toggleDesktop}
              visibleFrom="sm"
              radius="sm" 
              size="md"
              variant="subtle"
              color="gray.11"
              className="sidebar-toggle-icon"
              style={{ color: 'var(--gray-11)', marginLeft: '6px' }}
            >
              {desktopOpened ? (
                <IconLayoutSidebarLeftCollapse size={20} />
              ) : (
                <IconLayoutSidebarLeftExpand size={20} />
              )}
            </ActionIcon>
            <Text fw={600} size="lg" style={{ color: 'var(--gray-12)' }}>
              {getPageName()}
            </Text>
          </Group>

          <Group>
            <ActionIcon
              size="lg"
              variant="subtle"
              className="user-avatar-icon"
              style={{ color: 'var(--gray-11)' }}
              onClick={() => {
                // TODO: Handle notifications
                console.log('Notifications clicked');
              }}
            >
              <IconBell size={20} />
            </ActionIcon>
            
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon
                  size="lg"
                  variant="subtle"
                  className="user-avatar-icon"
                  style={{ color: 'var(--gray-11)' }}
                >
                  <IconUser size={20} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconUser size={16} />}
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  onClick={() => navigate('/settings')}
                >
                  Settings
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                  color="red"
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <Stack gap="xs">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  label={item.label}
                  leftSection={<item.icon size={20} stroke={1.5} />}
                  active={isActive}
                  onClick={() => {
                    navigate(item.path);
                    toggleMobile(); // Close mobile menu after navigation
                  }}
                  className="nav-menu-item"
                  style={{
                    borderRadius: '8px',
                    color: isActive ? 'var(--blue-9)' : undefined,
                    backgroundColor: isActive ? 'var(--blue-4)' : undefined
                  }}
                />
              );
            })}
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
