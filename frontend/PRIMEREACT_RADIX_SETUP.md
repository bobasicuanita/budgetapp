# PrimeReact + Tailwind + Radix Colors Setup Guide

## 🎨 What You Have Now

A powerful combination of:
- **Tailwind CSS** - Utility-first CSS framework
- **Radix Colors** - Beautiful, accessible color system
- **PrimeReact** - Rich UI component library

All working together seamlessly!

---

## 📦 Installation

Run this to install all packages:

```bash
npm install
```

---

## 🎨 Available Radix Colors

You now have access to all Radix color scales (1-12 shades):

### Light Theme Colors:
- `slate-1` to `slate-12`
- `gray-1` to `gray-12`
- `blue-1` to `blue-12`
- `red-1` to `red-12`
- `green-1` to `green-12`
- `yellow-1` to `yellow-12`
- `violet-1` to `violet-12`
- `amber-1` to `amber-12`
- `crimson-1` to `crimson-12`
- `teal-1` to `teal-12`
- `indigo-1` to `indigo-12`

### Dark Theme Colors (use with `dark:` prefix):
- `slate-dark-1` to `slate-dark-12`
- And all others with `-dark` suffix

### Semantic Colors (Already mapped for you):
- `primary-50` to `primary-900` (Blue scale)
- `success-50`, `success-500`, `success-700` (Green)
- `danger-50`, `danger-500`, `danger-700` (Red)
- `warning-50`, `warning-500`, `warning-700` (Amber)
- `info-50`, `info-500`, `info-700` (Blue)

---

## 🎯 How to Use

### 1. Using Radix Colors with Tailwind Classes

```jsx
// Background colors
<div className="bg-blue-9 text-blue-1">Blue background</div>

// Text colors
<div className="text-slate-12">Dark text</div>
<div className="text-slate-1">Light text</div>

// Semantic colors
<button className="bg-primary-500 text-white">Primary Button</button>
<div className="bg-success-500 text-white">Success</div>
<div className="bg-danger-500 text-white">Error</div>

// Dark mode support
<div className="bg-slate-1 dark:bg-slate-dark-1">
  Adapts to dark mode
</div>
```

### 2. Using PrimeReact Components with Radix Colors

```jsx
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';

function MyComponent() {
  return (
    <div className="p-4 bg-slate-2">
      <Card className="shadow-lg border-blue-6">
        <h2 className="text-slate-12 text-2xl font-bold mb-4">
          Login
        </h2>
        
        <InputText 
          placeholder="Email" 
          className="w-full mb-3 border-slate-7 focus:border-blue-9"
        />
        
        <Button 
          label="Login" 
          className="w-full bg-blue-9 hover:bg-blue-10 border-0"
        />
      </Card>
    </div>
  );
}
```

### 3. Customizing PrimeReact with Tailwind

PrimeReact components accept `className` and `style` props:

```jsx
<Button 
  label="Custom Button"
  className="bg-violet-9 hover:bg-violet-10 text-white font-semibold px-6 py-3 rounded-lg"
  icon="pi pi-check"
/>

<DataTable 
  className="border border-slate-7 rounded-lg overflow-hidden"
  headerClassName="bg-slate-3 text-slate-12"
/>
```

---

## 🎨 Color Palette Reference

Radix colors are numbered 1-12 with semantic meanings:

```
1-2   : App backgrounds
3     : Subtle borders
4     : UI element borders
5     : Hover UI element borders
6     : Solid backgrounds
7     : Hover solid backgrounds
8     : Active solid backgrounds
9     : Interactive components (buttons, links)
10    : Hover interactive components
11    : Low-contrast text
12    : High-contrast text
```

### Example Color Usage:

```jsx
// Card with proper hierarchy
<Card className="
  bg-slate-1           /* App background */
  border-slate-6       /* UI border */
">
  <h2 className="text-slate-12 mb-2">
    Title (high contrast)
  </h2>
  <p className="text-slate-11">
    Description (low contrast)
  </p>
  <Button className="
    bg-blue-9          /* Interactive component */
    hover:bg-blue-10   /* Hover state */
  ">
    Click Me
  </Button>
</Card>
```

---

## 🌙 Dark Mode Setup

Add a theme toggle:

```jsx
function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  return (
    <button 
      onClick={() => setDarkMode(!darkMode)}
      className="bg-slate-3 hover:bg-slate-4 p-2 rounded dark:bg-slate-dark-3"
    >
      {darkMode ? '🌞' : '🌙'}
    </button>
  );
}
```

Then use dark mode classes:

```jsx
<div className="
  bg-slate-1 dark:bg-slate-dark-1
  text-slate-12 dark:text-slate-dark-12
  border-slate-6 dark:border-slate-dark-6
">
  Content that adapts to theme
</div>
```

---

## 📋 Complete Example: Login Form

```jsx
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-2 p-4">
      <Card className="w-full max-w-md shadow-xl border border-slate-6 bg-slate-1">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-12 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-11">
            Sign in to continue to your account
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-12 mb-2">
              Email
            </label>
            <InputText 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full border-slate-7 focus:border-blue-9"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-12 mb-2">
              Password
            </label>
            <Password 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              toggleMask
              className="w-full"
              inputClassName="w-full border-slate-7 focus:border-blue-9"
            />
          </div>

          <Button 
            label="Sign In"
            icon="pi pi-sign-in"
            className="w-full bg-blue-9 hover:bg-blue-10 border-0 text-white font-semibold py-3"
          />

          <div className="text-center">
            <a href="/forgot-password" className="text-blue-11 hover:text-blue-12 text-sm">
              Forgot password?
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-slate-6 text-center">
          <p className="text-slate-11 text-sm">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-11 hover:text-blue-12 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default LoginForm;
```

---

## 🎨 Custom Color Combinations

Here are some beautiful combinations using Radix colors:

### Primary Actions
```jsx
<Button className="bg-blue-9 hover:bg-blue-10 text-white" />
```

### Success States
```jsx
<div className="bg-green-3 border border-green-7 text-green-11 p-3 rounded">
  Success message
</div>
```

### Error States
```jsx
<div className="bg-red-3 border border-red-7 text-red-11 p-3 rounded">
  Error message
</div>
```

### Info Cards
```jsx
<Card className="bg-blue-2 border border-blue-6">
  <p className="text-blue-12">Information</p>
</Card>
```

### Subtle Backgrounds
```jsx
<div className="bg-slate-3 hover:bg-slate-4 p-4 rounded">
  Hover effect
</div>
```

---

## 🚀 Next Steps

1. **Install dependencies**: `npm install`
2. **Start dev server**: `npm run dev`
3. **Try the example**: Create a component with the login form above
4. **Explore colors**: Check out [Radix Colors](https://www.radix-ui.com/colors) for color inspiration
5. **Browse components**: See [PrimeReact](https://primereact.org/) for available components

---

## 📚 Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix Colors](https://www.radix-ui.com/colors)
- [PrimeReact Components](https://primereact.org/)
- [PrimeReact Tailwind Integration](https://primereact.org/tailwind/)

Enjoy building beautiful UIs! 🎨✨
