import { Box, Text, Group, Skeleton } from '@mantine/core';
import PropTypes from 'prop-types';
import { formatCurrency } from '../../data/currencies';
import { 
  IconTrendingUp,
  IconTrendingDown,
  IconScale
} from '@tabler/icons-react';

/**
 * TransactionSummaryBoxes - Displays total income, expenses, and net income
 * Shows skeleton loading states while data is being fetched
 */
const TransactionSummaryBoxes = ({ totals, isLoading, baseCurrency = 'USD' }) => {
  const renderBox = (title, amount, type) => {
    const isPositive = amount >= 0;
    const displayAmount = Math.abs(amount);
    
    // Determine color and icon based on type
    let textColor;
    let Icon;
    
    if (type === 'income') {
      textColor = 'var(--green-9)';
      Icon = IconTrendingUp;
    } else if (type === 'expense') {
      textColor = 'var(--red-9)';
      Icon = IconTrendingDown;
    } else {
      // net income
      textColor = isPositive ? 'var(--green-9)' : 'var(--red-9)';
      Icon = IconScale;
    }
    
    return (
      <Box
        style={{
          flex: 1,
          padding: '16px',
          borderRadius: '8px',
          background: 'white',
          border: '1px solid var(--gray-4)',
          boxShadow: 'var(--mantine-shadow-md)'
        }}
      >
        <Group gap="xs" mb={4}>
          <Icon size={20} color={textColor} />
          <Text size="xs" c="gray.11" fw={500}>
            {title}
          </Text>
        </Group>
        
        {isLoading ? (
          <Skeleton height={32} width="70%" />
        ) : (
          <Text size="xl" fw={600} style={{ color: textColor }}>
            {type === 'income' && '+'}
            {type === 'expense' && '-'}
            {type === 'net' && isPositive && '+'}
            {type === 'net' && !isPositive && '-'}
            {formatCurrency(displayAmount, baseCurrency)}
          </Text>
        )}
      </Box>
    );
  };

  return (
    <Group gap="md" grow>
      {renderBox('TOTAL INCOME', totals.income, 'income')}
      {renderBox('TOTAL EXPENSES', totals.expenses, 'expense')}
      {renderBox('NET INCOME', totals.net, 'net')}
    </Group>
  );
};

TransactionSummaryBoxes.propTypes = {
  totals: PropTypes.shape({
    income: PropTypes.number.isRequired,
    expenses: PropTypes.number.isRequired,
    net: PropTypes.number.isRequired,
  }).isRequired,
  isLoading: PropTypes.bool,
  baseCurrency: PropTypes.string,
};

export default TransactionSummaryBoxes;
