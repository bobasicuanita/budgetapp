import { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const FilterDrawerContext = createContext();

export const FilterDrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <FilterDrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer }}>
      {children}
    </FilterDrawerContext.Provider>
  );
};

FilterDrawerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFilterDrawer = () => {
  const context = useContext(FilterDrawerContext);
  if (!context) {
    throw new Error('useFilterDrawer must be used within FilterDrawerProvider');
  }
  return context;
};
