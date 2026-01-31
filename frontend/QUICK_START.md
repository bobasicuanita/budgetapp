# 🚀 Quick Start Guide

## Installation

Run this command in the `frontend` directory:

```bash
npm install
```

This will install:
- ✅ **Tailwind CSS** - Utility-first CSS
- ✅ **Radix Colors** - Beautiful color system  
- ✅ **PrimeReact** - UI components
- ✅ **PrimeIcons** - Icon library

## Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:5173`

## Try the Example

To see everything in action, update your `App.jsx`:

```jsx
import ExampleLogin from './components/ExampleLogin';

function App() {
  return <ExampleLogin />;
}

export default App;
```

You'll see a beautiful login form using:
- 🎨 PrimeReact components
- 🎯 Tailwind utility classes
- 🌈 Radix color scales

## Quick Examples

### 1. Button with Radix Colors

```jsx
import { Button } from 'primereact/button';

<Button 
  label="Click Me"
  className="bg-blue-9 hover:bg-blue-10 text-white"
/>
```

### 2. Card with Color Scheme

```jsx
import { Card } from 'primereact/card';

<Card className="bg-slate-1 border border-slate-6">
  <h2 className="text-slate-12">Title</h2>
  <p className="text-slate-11">Description</p>
</Card>
```

### 3. Input with Custom Colors

```jsx
import { InputText } from 'primereact/inputtext';

<InputText 
  placeholder="Email"
  className="border-slate-7 focus:border-blue-9"
/>
```

## Color Reference

All Radix colors are available:

```jsx
// Backgrounds
className="bg-slate-1"    // Lightest
className="bg-slate-9"    // Interactive
className="bg-slate-12"   // Darkest

// Text
className="text-slate-11" // Low contrast
className="text-slate-12" // High contrast

// Borders
className="border-slate-6" // Subtle
className="border-slate-7" // UI elements
```

## Available Colors

- `slate`, `gray`, `blue`, `red`, `green`, `yellow`
- `violet`, `amber`, `crimson`, `teal`, `indigo`
- Plus semantic colors: `primary`, `success`, `danger`, `warning`, `info`

## Full Documentation

See `PRIMEREACT_RADIX_SETUP.md` for:
- Complete color palette
- Dark mode setup
- Advanced examples
- Best practices

Happy coding! 🎉
