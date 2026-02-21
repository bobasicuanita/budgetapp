import { useState, useRef, useEffect } from 'react';
import { Button, TextInput, Box, Group } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import PropTypes from 'prop-types';

/**
 * TransactionSearch - Expandable search input for transactions
 * Provides inline search with expand/collapse animation
 */
const TransactionSearch = ({ 
  initialValue = '', 
  onSearchApply,
  onSearchClear 
}) => {
  const [searchExpanded, setSearchExpanded] = useState(!!initialValue);
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const searchInputRef = useRef(null);

  // Update search query when initialValue changes from parent
  useEffect(() => {
    setSearchQuery(initialValue);
    setSearchExpanded(!!initialValue);
  }, [initialValue]);

  const handleCollapseSearch = () => {
    setSearchExpanded(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearchClear) {
      onSearchClear();
    }
  };

  const handleApplySearch = () => {
    if (onSearchApply) {
      onSearchApply(searchQuery);
    }
  };

  if (searchExpanded) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '300px',
          animation: 'expandSearch 0.2s ease-out',
        }}
      >
        <TextInput
          ref={searchInputRef}
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onBlur={(e) => {
            // Don't collapse if clicking icons
            const relatedTarget = e.relatedTarget;
            if (relatedTarget?.hasAttribute('data-search-action')) {
              return;
            }
            if (!searchQuery.trim()) {
              handleCollapseSearch();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClearSearch();
              handleCollapseSearch();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              handleApplySearch();
            }
          }}
          size="sm"
          className="text-input"
          style={{ width: '100%' }}
          styles={{
            root: { width: '100%' },
          }}
          rightSection={
            <Group gap={4} wrap="nowrap" style={{ pointerEvents: 'all' }}>
              {searchQuery && (
                <IconX
                  size={16}
                  data-search-action
                  style={{ cursor: 'pointer', color: 'var(--gray-9)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClearSearch();
                    searchInputRef.current?.focus();
                  }}
                />
              )}
              <IconSearch
                size={16}
                data-search-action
                style={{ cursor: 'pointer', color: 'var(--blue-9)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleApplySearch();
                  searchInputRef.current?.focus();
                }}
              />
            </Group>
          }
          rightSectionWidth={searchQuery ? 50 : 30}
        />
      </Box>
    );
  }

  return (
    <Button 
      variant="subtle" 
      color="blue.9" 
      c="blue.9"
      leftSection={<IconSearch size={18} />}
      size="sm"
      onClick={() => {
        setSearchExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }}
    >
      Search
    </Button>
  );
};

TransactionSearch.propTypes = {
  initialValue: PropTypes.string,
  onSearchApply: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
};

export default TransactionSearch;
