# Frontend Setup Instructions

## 📦 Install Dependencies

```bash
npm install react-router-dom
```

React Query is already installed! ✅

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx     ← Create this
│   ├── pages/
│   │   ├── Login.jsx              ← Create this
│   │   ├── SignUp.jsx             ← Create this
│   │   ├── Dashboard.jsx          ← Create this
│   │   ├── Settings.jsx           ← Create this
│   │   ├── Budgets.jsx            ← Create this
│   │   ├── Transactions.jsx       ← Create this
│   │   └── NotFound.jsx           ← Create this
│   ├── routes/
│   │   └── AppRoutes.jsx          ← Create this
│   ├── App.jsx                    ← Update this
│   └── main.jsx                   ← Already set up
```

## ✅ Files Already Created for You

- ✅ `src/components/ProtectedRoute.jsx`
- ✅ `src/routes/AppRoutes.jsx`
- ✅ `src/pages/Login.jsx` (example)
- ✅ `src/pages/Dashboard.jsx` (example)
- ✅ `src/AppExample.jsx` (reference for App.jsx structure)

## 🚀 Quick Start

### 1. Update Your `App.jsx`:

```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes/AppRoutes';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

export default App;
```

### 2. Create Missing Page Components:

```javascript
// src/pages/SignUp.jsx
function SignUp() {
  return <div>Sign Up Page - TODO</div>;
}
export default SignUp;

// src/pages/Settings.jsx
function Settings() {
  return <div>Settings Page - TODO</div>;
}
export default Settings;

// src/pages/Budgets.jsx
function Budgets() {
  return <div>Budgets Page - TODO</div>;
}
export default Budgets;

// src/pages/Transactions.jsx
function Transactions() {
  return <div>Transactions Page - TODO</div>;
}
export default Transactions;

// src/pages/NotFound.jsx
function NotFound() {
  return <div>404 - Page Not Found</div>;
}
export default NotFound;
```

### 3. Test Your Routes:

Start the frontend:
```bash
npm run dev
```

Try visiting:
- `http://localhost:5173/login` ✅ Should work
- `http://localhost:5173/signup` ✅ Should work
- `http://localhost:5173/dashboard` ❌ Should redirect to login (no token)

### 4. Test Login Flow:

1. Go to `/login`
2. Enter credentials (email: test@example.com, password: Password123)
3. Should redirect to `/dashboard` after successful login
4. Dashboard should fetch and display your user data

## 🔐 Authentication Flow

```
1. User visits /dashboard
   ↓
2. ProtectedRoute checks for token in localStorage
   ↓
3a. No token → Redirect to /login
3b. Has token → Show Dashboard
   ↓
4. Dashboard makes API call with token
   ↓
5. Backend validates token
   ↓
6a. Valid → Returns user data
6b. Invalid → Returns 401, redirect to login
```

## 📝 Making Authenticated Requests

Always include the token:

```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 🛡️ Security Notes

- ✅ Frontend route protection prevents UI access
- ✅ Backend API protection prevents data access
- ✅ Both are necessary for complete security
- ✅ Token stored in localStorage
- ✅ Token sent with every API request

## 📚 More Info

See `../ROUTING_GUIDE.md` for complete documentation!
