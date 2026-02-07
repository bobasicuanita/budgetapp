import * as flags from 'country-flag-icons/react/3x2';

/**
 * Renders a country flag SVG
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
 * @param {number} size - Height of the flag in pixels
 */
export const CountryFlag = ({ countryCode, size = 16 }) => {
  const FlagComponent = flags[countryCode];
  
  if (!FlagComponent) {
    // Fallback if flag not found
    return <span style={{ fontSize: size }}>🏳️</span>;
  }

  return (
    <FlagComponent 
      style={{ 
        height: `${size}px`, 
        width: 'auto',
        borderRadius: '2px',
        display: 'inline-block',
        verticalAlign: 'middle'
      }} 
    />
  );
};
