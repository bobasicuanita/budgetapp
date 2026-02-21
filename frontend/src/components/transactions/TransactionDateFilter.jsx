import { useState, useMemo } from 'react';
import { Button, Popover, Stack, Group, Tooltip, Text, SegmentedControl } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';

/**
 * TransactionDateFilter - Date range filter with popover and presets
 * Provides preset date ranges and custom date selection
 */
const TransactionDateFilter = ({ 
  dateFilterType = 'thisMonth', 
  dateRange,
  onDateFilterChange,
  onDateFilterClear
}) => {
  const [datePopoverOpened, setDatePopoverOpened] = useState(false);
  const [tempDateRange, setTempDateRange] = useState([null, null]);
  const [dateMode, setDateMode] = useState('range'); // 'single' or 'range'

  // Format date filter button text
  const dateFilterButtonText = useMemo(() => {
    if (dateFilterType === 'custom' && dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0] instanceof Date ? dateRange[0] : new Date(dateRange[0]);
      const endDate = dateRange[1] instanceof Date ? dateRange[1] : new Date(dateRange[1]);
      const sameYear = startDate.getFullYear() === endDate.getFullYear();
      
      const formatOptions = sameYear 
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
      
      return `${startDate.toLocaleDateString('en-US', formatOptions)} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
    }
    
    switch (dateFilterType) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'last7days':
        return 'Last 7 days';
      case 'lastMonth':
        return 'Last Month';
      case 'thisYear':
        return 'This Year';
      case 'lastYear':
        return 'Last Year';
      case 'allTime':
        return 'All time';
      case 'thisMonth':
      default:
        return 'This Month';
    }
  }, [dateFilterType, dateRange]);

  // Date filter tooltip text
  const dateFilterTooltip = useMemo(() => {
    if (dateFilterType === 'thisMonth') {
      return 'Click to select a custom date range';
    }
    if (dateFilterType === 'custom') {
      return 'Custom date range selected';
    }
    return 'Custom date range selected';
  }, [dateFilterType]);

  const handleDateRangeChange = (value) => {
    // Handle single date mode
    if (dateMode === 'single') {
      // Single date returns a Date object, convert to range format [date, date]
      if (value) {
        const singleDate = value instanceof Date ? value : new Date(value);
        setTempDateRange([singleDate, singleDate]);
      } else {
        setTempDateRange([null, null]);
      }
      return;
    }
    
    // Handle range mode
    setTempDateRange(value);
    
    // Check if this matches a preset (both dates selected)
    if (value && value[0] && value[1]) {
      const normalizedRange = [
        value[0] instanceof Date ? value[0] : new Date(value[0]),
        value[1] instanceof Date ? value[1] : new Date(value[1])
      ];
      
      const today = dayjs().startOf('day');
      const start = dayjs(normalizedRange[0]).startOf('day');
      const end = dayjs(normalizedRange[1]).startOf('day');
      
      // Check if matches "Today"
      if (start.isSame(today, 'day') && end.isSame(today, 'day')) {
        onDateFilterChange('today', normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Yesterday"
      const yesterday = today.subtract(1, 'day');
      if (start.isSame(yesterday, 'day') && end.isSame(yesterday, 'day')) {
        onDateFilterChange('yesterday', normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Last 7 days"
      const weekAgo = today.subtract(6, 'days');
      if (start.isSame(weekAgo, 'day') && end.isSame(today, 'day')) {
        onDateFilterChange('last7days', normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Last Month"
      const firstDayLastMonth = today.subtract(1, 'month').startOf('month');
      const lastDayLastMonth = today.subtract(1, 'month').endOf('month').startOf('day');
      if (start.isSame(firstDayLastMonth, 'day') && end.isSame(lastDayLastMonth, 'day')) {
        onDateFilterChange('lastMonth', normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "This Year"
      const firstDayThisYear = today.startOf('year');
      const lastDayThisYear = today.endOf('year').startOf('day');
      if (start.isSame(firstDayThisYear, 'day') && end.isSame(lastDayThisYear, 'day')) {
        onDateFilterChange('thisYear', normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "Last Year"
      const firstDayLastYear = today.subtract(1, 'year').startOf('year');
      const lastDayLastYear = today.subtract(1, 'year').endOf('year').startOf('day');
      if (start.isSame(firstDayLastYear, 'day') && end.isSame(lastDayLastYear, 'day')) {
        onDateFilterChange('lastYear', normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
      
      // Check if matches "All time"
      const startOfTime = dayjs('2000-01-01');
      if (start.isSame(startOfTime, 'day') && end.isSame(today, 'day')) {
        onDateFilterChange('allTime', normalizedRange);
        setDatePopoverOpened(false);
        return;
      }
    }
  };

  const handleApplyDateFilter = () => {
    if (tempDateRange && tempDateRange[0]) {
      // Single mode always has both dates the same
      // Range mode might have only start date selected, so default end to start
      const startDate = tempDateRange[0] instanceof Date ? tempDateRange[0] : new Date(tempDateRange[0]);
      const endDate = tempDateRange[1] 
        ? (tempDateRange[1] instanceof Date ? tempDateRange[1] : new Date(tempDateRange[1]))
        : startDate; // Default to same date if only start selected
      
      const normalizedRange = [startDate, endDate];
      onDateFilterChange('custom', normalizedRange);
    }
    setDatePopoverOpened(false);
  };

  const handleClearDateFilter = () => {
    onDateFilterClear();
    setTempDateRange([null, null]);
    setDatePopoverOpened(false);
  };

  return (
    <Popover 
      opened={datePopoverOpened} 
      onChange={setDatePopoverOpened}
      position="bottom-end"
      width={320}
      shadow="md"
      withArrow
      closeOnClickOutside={true}
      closeOnEscape={true}
      clickOutsideEvents={['mousedown', 'touchstart']}
    >
      <Popover.Target>
        <Tooltip label={dateFilterTooltip} position="top">
          <Button 
            variant="subtle" 
            color="blue.9" 
            c="blue.9"
            leftSection={<IconCalendar size={18} />}
            size="sm"
            onClick={() => {
              const willOpen = !datePopoverOpened;
              if (willOpen && dateFilterType === 'custom' && dateRange) {
                setTempDateRange(dateRange);
              } else if (willOpen && dateFilterType !== 'custom') {
                setTempDateRange([null, null]);
              }
              setDatePopoverOpened(willOpen);
            }}
          >
            {dateFilterButtonText}
          </Button>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="md">
        {/* Mode selector */}
          <SegmentedControl
            value={dateMode}
            onChange={(value) => {
              setDateMode(value);
              setTempDateRange([null, null]); // Reset selection when switching modes
            }}
            data={[
              { label: 'Single Day', value: 'single' },
              { label: 'Date Range', value: 'range' }
            ]}
            fullWidth
            size="xs"
          />
          {/* Date range picker */}
          <DatePickerInput
            type={dateMode === 'single' ? 'default' : 'range'}
            placeholder={dateMode === 'single' ? 'Pick a date' : 'Pick date range'}
            value={dateMode === 'single' ? (tempDateRange[0] || null) : tempDateRange}
            onChange={handleDateRangeChange}
            size="sm"
            className="text-input"
            defaultDate={new Date()}
            popoverProps={{ 
              withinPortal: false,
              closeOnClickOutside: false,
              clickOutsideEvents: []
            }}
            presets={dateMode === 'range' ? [
              { value: [dayjs().toDate(), dayjs().toDate()], label: 'Today' },
              { value: [dayjs().subtract(1, 'day').toDate(), dayjs().subtract(1, 'day').toDate()], label: 'Yesterday' },
              { value: [dayjs().subtract(6, 'days').toDate(), dayjs().toDate()], label: 'Last 7 days' },
              { value: [dayjs().subtract(1, 'month').startOf('month').toDate(), dayjs().subtract(1, 'month').endOf('month').toDate()], label: 'Last Month' },
              { value: [dayjs().startOf('year').toDate(), dayjs().endOf('year').toDate()], label: 'This Year' },
              { value: [dayjs().subtract(1, 'year').startOf('year').toDate(), dayjs().subtract(1, 'year').endOf('year').toDate()], label: 'Last Year' },
              { value: [dayjs('2000-01-01').toDate(), dayjs().toDate()], label: 'All time' },
            ] : undefined}
          />

          {/* Action buttons */}
          <Group justify="space-between">
            <Button 
              variant="subtle" 
              size="xs" 
              onClick={handleClearDateFilter}
              c="blue.9"
            >
              Clear
            </Button>
            <Button 
              variant="filled" 
              size="xs" 
              color="blue.9"
              onClick={handleApplyDateFilter}
              disabled={!tempDateRange || !tempDateRange[0]}
            >
              Apply
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

TransactionDateFilter.propTypes = {
  dateFilterType: PropTypes.string,
  dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  onDateFilterChange: PropTypes.func.isRequired,
  onDateFilterClear: PropTypes.func.isRequired,
};

export default TransactionDateFilter;
