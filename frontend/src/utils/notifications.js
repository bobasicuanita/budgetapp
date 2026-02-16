import { notifications } from '@mantine/notifications';

/**
 * Custom notification utility with consistent styling
 * Wraps @mantine/notifications with app-wide styles
 * 
 * Usage:
 * - showSuccessNotification('Message')
 * - showErrorNotification('Error message')
 * - showInfoNotification('Info message')
 * - showWarningNotification('Warning message')
 * 
 * For custom configurations:
 * - showSuccessNotification('Message', 'Custom Title', { withBorder: true, radius: 'lg' })
 * 
 * All notifications automatically apply consistent text colors:
 * - Title: gray.12
 * - Message: gray.9
 */

const defaultStyles = {
  title: { color: 'var(--gray-12)' },
  description: { color: 'var(--gray-9)' }
};

export const showNotification = (config) => {
  notifications.show({
    ...config,
    styles: {
      ...defaultStyles,
      ...(config.styles || {})
    }
  });
};

export const showSuccessNotification = (message, title = 'Success', config = {}) => {
  showNotification({
    title,
    message,
    color: 'green',
    ...config
  });
};

export const showErrorNotification = (message, title = 'Error', config = {}) => {
  showNotification({
    title,
    message,
    color: 'red',
    ...config
  });
};

export const showInfoNotification = (message, title = 'Info', config = {}) => {
  showNotification({
    title,
    message,
    color: 'blue',
    ...config
  });
};

export const showWarningNotification = (message, title = 'Warning', config = {}) => {
  showNotification({
    title,
    message,
    color: 'yellow',
    ...config
  });
};
