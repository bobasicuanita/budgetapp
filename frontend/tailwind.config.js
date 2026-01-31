import {
  slate,
  gray,
  blue,
  red,
  green,
  yellow,
  violet,
  amber,
  crimson,
  teal,
  indigo,
  // Dark variants
  slateDark,
  grayDark,
  blueDark,
  redDark,
  greenDark,
  yellowDark,
  violetDark,
  amberDark,
  crimsonDark,
  tealDark,
  indigoDark,
} from '@radix-ui/colors';

// Function to convert Radix color scales to Tailwind format
function radixToTailwind(colorScale) {
  const colors = {};
  for (const [key, value] of Object.entries(colorScale)) {
    // Extract the number from the key (e.g., 'blue1' -> '1', 'blue12' -> '12')
    const num = key.match(/\d+$/)?.[0];
    if (num) {
      colors[num] = value;
    }
  }
  return colors;
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme colors
        slate: radixToTailwind(slate),
        gray: radixToTailwind(gray),
        blue: radixToTailwind(blue),
        red: radixToTailwind(red),
        green: radixToTailwind(green),
        yellow: radixToTailwind(yellow),
        violet: radixToTailwind(violet),
        amber: radixToTailwind(amber),
        crimson: radixToTailwind(crimson),
        teal: radixToTailwind(teal),
        indigo: radixToTailwind(indigo),
        
        // Dark theme colors (with 'dark' prefix)
        'slate-dark': radixToTailwind(slateDark),
        'gray-dark': radixToTailwind(grayDark),
        'blue-dark': radixToTailwind(blueDark),
        'red-dark': radixToTailwind(redDark),
        'green-dark': radixToTailwind(greenDark),
        'yellow-dark': radixToTailwind(yellowDark),
        'violet-dark': radixToTailwind(violetDark),
        'amber-dark': radixToTailwind(amberDark),
        'crimson-dark': radixToTailwind(crimsonDark),
        'teal-dark': radixToTailwind(tealDark),
        'indigo-dark': radixToTailwind(indigoDark),
        
        // Semantic color mappings for your app
        primary: {
          50: blue.blue1,
          100: blue.blue2,
          200: blue.blue3,
          300: blue.blue4,
          400: blue.blue5,
          500: blue.blue9,   // Main primary color
          600: blue.blue10,
          700: blue.blue11,
          800: blue.blue12,
          900: blue.blue12,
        },
        success: {
          50: green.green1,
          500: green.green9,
          700: green.green11,
        },
        danger: {
          50: red.red1,
          500: red.red9,
          700: red.red11,
        },
        warning: {
          50: amber.amber1,
          500: amber.amber9,
          700: amber.amber11,
        },
        info: {
          50: blue.blue1,
          500: blue.blue9,
          700: blue.blue11,
        },
      },
    },
  },
  plugins: [],
}
