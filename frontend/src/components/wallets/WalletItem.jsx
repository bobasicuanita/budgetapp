import { memo, useMemo } from 'react';
import { Text, Group, Box, Avatar, ActionIcon, Menu, Badge, Tooltip, Divider } from '@mantine/core';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { IconEdit, IconDotsVertical, IconArrowsExchange, IconReceipt } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../data/currencies';
import PropTypes from 'prop-types';

function WalletItem({ wallet, initials, index, handleEditWallet, handleTransferFromWallet, isLast}) {
    const navigate = useNavigate();

    const formattedAmount = useMemo(() => 
      formatCurrency(wallet.current_balance, wallet.currency),
      [wallet.current_balance, wallet.currency]
    );
    return (
      <Box>
        <Box 
        py="md"
        style={{ 
            display: 'grid',
            gridTemplateColumns: '280px 120px 1fr',
            gap: '16px',
            alignItems: 'center'
        }}
        >
        {/* Column 1: Wallet info */}
        <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
            {wallet.icon && (wallet.icon.startsWith('data:image') || wallet.icon.startsWith('http')) ? (
            <Box
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--gray-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <img 
                src={wallet.icon} 
                alt={wallet.name}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
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
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <Group gap="xs" wrap="nowrap">
              <Tooltip 
                label={wallet.name}
                disabled={wallet.name.length <= 18}
                withArrow
              >
                <Text 
                  size="sm" 
                  fw={500}
                  component="a"
                  onClick={() => navigate(`/wallets/${wallet.id}`)}
                  style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: 'inherit'
                 }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  {wallet.name}
                </Text>
              </Tooltip>
              <Tooltip 
                label={wallet.include_in_balance 
                    ? "This wallet is counted in your available balance" 
                    : "This wallet is not counted in your available balance"
                }
                withArrow
                >
                <Badge
                  size="sm"
                  variant="light"
                  styles={{
                    root: {
                        color: wallet.include_in_balance ? 'var(--green-9)' : 'var(--gray-9)',
                        flexShrink: 0
                    }
                  }}
                >
                  {wallet.include_in_balance ? "Included" : "Excluded"}
                </Badge>
              </Tooltip>
            </Group>
          </div>
        </Group>
        
        {/* Column 2: Sparkline */}
        <Box 
          style={{ 
            width: '120px', 
            height: '44px',
            overflow: 'hidden'
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            style={{ width: '100%', height: '100%' }}
          >
            <div className="sparkline">
              <Sparklines 
                data={wallet.balance_history && wallet.balance_history.length > 0 ? wallet.balance_history : [0]} 
                width={100} 
                height={36}
                margin={5}
                >
                <SparklinesLine 
                    style={{ 
                    stroke: 'var(--gray-9)',
                    strokeWidth: 0.5,
                    fill: 'none'
                    }} 
                />
              </Sparklines>
            </div>
            </motion.div>
        </Box>
        
        {/* Column 3: Amount + Menu */}
        <Group gap="md" align="center" wrap="nowrap" style={{ justifySelf: 'end' }}>
          <Text 
            fw={500} 
            style={{ 
              marginRight: '-6px',
              whiteSpace: 'nowrap',
              fontSize: (() => {
                if (formattedAmount.length > 20) return '10px';
                if (formattedAmount.length > 15) return '11px';
                if (formattedAmount.length > 12) return '12px';
                return '14px';
              })()
            }}
          >
            {formatCurrency(wallet.current_balance, wallet.currency)}
          </Text>
          <Menu shadow="md" width={200} position="right-start">
            <Menu.Target>
              <ActionIcon 
                variant="subtle"
                radius="sm"
                color="gray.11"
                className="wallet-edit-icon"
                style={{
                    color: `var(--gray-12)`
                }}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={16} />}
                onClick={() => handleEditWallet(wallet)}
              >
                Edit Wallet
              </Menu.Item>
              <Menu.Item
                leftSection={<IconArrowsExchange size={16} />}
                onClick={() => handleTransferFromWallet(wallet)}
              >
                Transfer From Wallet
              </Menu.Item>
              <Menu.Item
                leftSection={<IconReceipt size={16} />}
                onClick={() => {
                    navigate(`/wallets/${wallet.id}`);
                }}
              >
                Wallet Details
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>
        {index < isLast && <Divider />}
    </Box>
  )
}

WalletItem.propTypes = {
  wallet: PropTypes.object.isRequired,
  handleEditWallet: PropTypes.func.isRequired,
  intials: PropTypes.string,
  handleTransferFromWallet: PropTypes.func.isRequired,
  isLast: PropTypes.bool
};

export default memo(WalletItem);