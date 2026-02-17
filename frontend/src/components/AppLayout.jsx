import { AppShell, Group, NavLink, Text, Stack, Box, Menu, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
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
  
  // Initialize sidebar state from localStorage, default to true (open)
  const [desktopOpened, setDesktopOpened] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(desktopOpened));
  }, [desktopOpened]);

  const toggleDesktop = () => {
    setDesktopOpened(prev => !prev);
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
      // Clear local storage
      localStorage.removeItem('accessToken');
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Redirect to login
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
      navbar={{
        width: desktopOpened ? 220 : 70,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: 'var(--blue-3)'
        },
        navbar: {
          backgroundColor: 'var(--blue-3)',
          border: 'none',
          transition: 'width 0.2s ease'
        }
      }}
    >
      <AppShell.Navbar px="md">
        <Stack justify="space-between" h="100%">
          {/* Sidebar Header */}
          <Stack gap="md">
            <Group gap="sm" my="sm" wrap="nowrap" ml={desktopOpened ? "6px" : "2px"}>
              <ActionIcon
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="lg"
                variant="subtle"
                className="sidebar-toggle-icon"
                style={{ color: 'var(--gray-12)' }}
              >
                <IconMenu2 size={20} />
              </ActionIcon>
              <ActionIcon
                onClick={toggleDesktop}
                visibleFrom="sm"
                radius="md" 
                size="lg"
                variant="subtle"
                color="gray.11"
                className="sidebar-toggle-icon"
                style={{ color: 'var(--gray-12)', flexShrink: 0 }}
              >
                {desktopOpened ? (
                  <IconLayoutSidebarLeftCollapse size={20} />
                ) : (
                  <IconLayoutSidebarLeftExpand size={20} />
                )}
              </ActionIcon>
              <Text 
                fw={700} 
                size="xl" 
                style={{ 
                  color: 'var(--blue-9)', 
                  whiteSpace: 'nowrap',
                  opacity: desktopOpened ? 1 : 0,
                  width: desktopOpened ? 'auto' : 0,
                  overflow: 'hidden',
                  transition: 'opacity 0.2s ease, width 0.2s ease'
                }}
              >
                BudgetApp
              </Text>
            </Group>

            {/* Navigation Items */}
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
                      justifyContent: desktopOpened ? 'flex-start' : 'center',
                      backgroundColor: isActive ? 'var(--blue-4)' : undefined,
                    }}
                    styles={{
                      label: {
                        opacity: desktopOpened ? 1 : 0,
                        width: desktopOpened ? 'auto' : 0,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      },
                      ...(!desktopOpened && {
                        section: {
                          marginRight: 0
                        }
                      })
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>

          {/* Bottom Section */}
          <Stack gap="xs">
            <NavLink
              label="Notifications"
              leftSection={<IconBell size={20} stroke={1.5} />}
              onClick={() => {
                // TODO: Handle notifications
                console.log('Notifications clicked');
              }}
              className="nav-menu-item"
              style={{
                justifyContent: desktopOpened ? 'flex-start' : 'center',
                borderRadius: '8px'
              }}
              styles={{
                label: {
                  opacity: desktopOpened ? 1 : 0,
                  width: desktopOpened ? 'auto' : 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                },
                ...(!desktopOpened && {
                  section: {
                    marginRight: 0
                  }
                })
              }}
            />

            <Menu shadow="md" width={200} position="right-end">
              <Menu.Target>
                <NavLink
                  label="Account"
                  leftSection={<IconUser size={20} stroke={1.5} />}
                  className="nav-menu-item"
                  style={{
                    borderRadius: '8px',
                    justifyContent: desktopOpened ? 'flex-start' : 'center',
                    cursor: 'pointer'
                  }}
                  styles={{
                    label: {
                      opacity: desktopOpened ? 1 : 0,
                      width: desktopOpened ? 'auto' : 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    },
                    ...(!desktopOpened && {
                      section: {
                        marginRight: 0
                      }
                    })
                  }}
                />
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
                  styles={{
                    item: {
                      color: 'var(--red-9)'
                    }
                  }}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;
