# PrimeReact Ripple Effect Guide

## ✅ Already Configured

Ripple is enabled globally in your app via `main.jsx`:

```jsx
<PrimeReactProvider value={{ ripple: true }}>
  <App />
</PrimeReactProvider>
```

---

## 🎯 Automatic Ripple

All PrimeReact components automatically have ripple:

```jsx
import { Button } from 'primereact/button';

// Ripple works automatically - no extra code needed!
<Button label="Click Me" />
```

**Components with automatic ripple:**
- ✅ Button
- ✅ Checkbox
- ✅ RadioButton
- ✅ Menu items
- ✅ DataTable rows (when selectable)
- ✅ And many more!

---

## 🎨 Manual Ripple on Custom Elements

For custom clickable elements, use the `Ripple` component:

```jsx
import { Ripple } from 'primereact/ripple';

<div className="p-ripple cursor-pointer relative">
  Click me!
  <Ripple />
</div>
```

### Requirements:

1. **`p-ripple` class** - Enables ripple effect
2. **`relative` class** - For proper positioning
3. **`<Ripple />` component** - The ripple element
4. **Interactive styling** - `cursor-pointer`, `hover:bg-*`, etc.

---

## 📚 Examples

### 1. Custom Card with Ripple

```jsx
import { Ripple } from 'primereact/ripple';

<div 
  className="p-ripple relative bg-slate-2 hover:bg-slate-3 p-6 rounded-lg cursor-pointer"
  onClick={() => console.log('Card clicked')}
>
  <h3>Clickable Card</h3>
  <p>Click anywhere to see ripple</p>
  <Ripple />
</div>
```

### 2. Custom Link with Ripple

```jsx
import { Ripple } from 'primereact/ripple';

<a 
  href="/dashboard"
  className="p-ripple relative text-blue-11 hover:text-blue-12 p-2 rounded inline-block"
>
  Go to Dashboard
  <Ripple />
</a>
```

### 3. Icon Button with Ripple

```jsx
import { Ripple } from 'primereact/ripple';

<button 
  className="p-ripple relative w-10 h-10 rounded-full bg-blue-9 hover:bg-blue-10 flex items-center justify-center"
>
  <i className="pi pi-search text-white"></i>
  <Ripple />
</button>
```

### 4. List Item with Ripple

```jsx
import { Ripple } from 'primereact/ripple';

<li 
  className="p-ripple relative hover:bg-slate-3 p-3 cursor-pointer"
  onClick={handleClick}
>
  <span>Menu Item</span>
  <Ripple />
</li>
```

---

## 🎨 Styling the Ripple

You can customize the ripple color using CSS:

```css
/* In your component or CSS file */
.p-ripple-custom .p-ink {
  background: rgba(139, 92, 246, 0.3); /* Violet ripple */
}
```

Then use:
```jsx
<div className="p-ripple p-ripple-custom relative">
  Custom color ripple
  <Ripple />
</div>
```

---

## 🎯 Best Practices

### ✅ DO:
- Use ripple on clickable/interactive elements
- Add `cursor-pointer` for visual feedback
- Ensure proper contrast with ripple color
- Add hover states for better UX

### ❌ DON'T:
- Use ripple on non-interactive elements
- Forget the `relative` class
- Forget the `p-ripple` class
- Nest multiple ripples in the same element

---

## 🐛 Troubleshooting

### Ripple not appearing?

**Check these:**
1. ✅ `p-ripple` class added?
2. ✅ `relative` class added?
3. ✅ `<Ripple />` component included?
4. ✅ PrimeReactProvider configured in `main.jsx`?

### Ripple position wrong?

**Solution:** Ensure parent has `relative` class:
```jsx
<div className="p-ripple relative">  {/* ← relative is important! */}
  Content
  <Ripple />
</div>
```

---

## 🎉 You're All Set!

Ripple is now working across your entire app. Try clicking buttons, links, and custom elements to see it in action!

**Examples to try:**
- Click any PrimeReact Button
- Click "Remember me" in the login form
- Click "Forgot password?" link
- Click social login buttons

Happy clicking! ✨
