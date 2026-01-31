# MERN App Routing Guide

## 🎯 Understanding Frontend vs Backend Routing

In a MERN stack app, you have **two separate routing systems**:

### 1. **Frontend Routing (React Router)** - Handles UI/Pages
- Controls what component/page the user sees
- Changes the URL in the browser
- Client-side only (no server request)
- Examples: `/login`, `/dashboard`, `/settings`

### 2. **Backend Routing (Express)** - Handles Data/API
- Processes data requests
- Returns JSON data
- Server-side only
- Examples: `/api/auth/login`, `/api/budgets`, `/api/transactions`

---

## 📊 **Architecture Diagram**

```
Browser URL: http://localhost:5173/dashboard
     ↓
React Router catches this
     ↓
Renders Dashboard Component
     ↓
Dashboard makes API call: http://localhost:5000/api/auth/me
     ↓
Express Backend processes API request
     ↓
Returns JSON data: { user: {...} }
     ↓
Dashboard displays the data
```

---

## 🔐 **Route Protection Strategy**

### Frontend Protection (React Router)
**Purpose:** Control what users see/access

```javascript
// ProtectedRoute.jsx
if (!token) {
  return <Navigate to="/login" />;  // Redirect if not logged in
}
return children;  // Show component if logged in
```

**What it prevents:**
- ✅ Unauthorized users from seeing protected pages
- ✅ Users without token from accessing UI

**What it DOESN'T prevent:**
- ❌ API calls to backend (anyone can use curl/Postman)

### Backend Protection (Express Middleware)
**Purpose:** Secure actual data

```javascript
// Already implemented in your backend
app.use(authenticateToken);  // Protects all routes below
```

**What it prevents:**
- ✅ Unauthorized API access (even from curl/Postman)
- ✅ Data theft/manipulation
- ✅ Users from accessing other users' data

---

## 🛠️ **Implementation Guide**

### Step 1: Install React Router

```bash
npm install react-router-dom
```

### Step 2: Create Route Protection

**File: `frontend/src/components/ProtectedRoute.jsx`**
```javascript
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;
```

### Step 3: Set Up Routes

**File: `frontend/src/routes/AppRoutes.jsx`**
```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 4: Make Authenticated API Calls

**Always include the token in requests:**

```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:5000/api/budgets', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 📋 **Complete Example: Login Flow**

### 1. User Visits `/login` (React Router)
```javascript
// React Router shows Login component
<Route path="/login" element={<Login />} />
```

### 2. User Submits Login Form
```javascript
// Login.jsx
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
localStorage.setItem('token', data.token);  // Save token
navigate('/dashboard');  // Redirect to dashboard
```

### 3. React Router Changes URL to `/dashboard`
```javascript
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>  // ← Checks for token
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

### 4. Dashboard Fetches User Data
```javascript
// Dashboard.jsx
const response = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### 5. Backend Validates Token & Returns Data
```javascript
// Backend (already implemented)
authenticateToken middleware → validates token → returns user data
```

---

## 🚫 **Common Mistakes to Avoid**

### ❌ WRONG: Trying to handle page routes in backend
```javascript
// DON'T DO THIS in backend
app.get('/dashboard', (req, res) => {
  res.send('<html>...</html>');  // ❌ Wrong!
});
```

### ✅ RIGHT: Let React Router handle page routes
```javascript
// React Router (frontend)
<Route path="/dashboard" element={<Dashboard />} />
```

### ❌ WRONG: Not including token in API requests
```javascript
// This will fail on protected endpoints
fetch('http://localhost:5000/api/budgets');  // ❌ No token!
```

### ✅ RIGHT: Always include token
```javascript
fetch('http://localhost:5000/api/budgets', {
  headers: { 'Authorization': `Bearer ${token}` }  // ✅ With token
});
```

---

## 🔒 **Security Best Practices**

### 1. **Always Protect Both Sides**
- Frontend: Prevents UI access
- Backend: Prevents data access

### 2. **Store Token Securely**
```javascript
// After login
localStorage.setItem('token', token);

// When making requests
const token = localStorage.getItem('token');

// On logout
localStorage.removeItem('token');
```

### 3. **Handle Token Expiration**
```javascript
const response = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (response.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('token');
  navigate('/login');
}
```

### 4. **Validate on Every Request**
Your backend already does this:
```javascript
app.use(authenticateToken);  // Validates token on every request
```

---

## 📝 **Quick Reference**

### Frontend Routes (React Router)
```
/                    → Redirect to /login
/login               → Login Page (public)
/signup              → Sign Up Page (public)
/dashboard           → Dashboard (protected)
/settings            → Settings (protected)
/budgets             → Budgets (protected)
/transactions        → Transactions (protected)
```

### Backend API Routes (Express)
```
POST   /api/auth/register       → Register user
POST   /api/auth/login          → Login, get token
POST   /api/auth/logout         → Logout (requires token)
GET    /api/auth/me             → Get user data (requires token)
GET    /api/budgets             → Get budgets (requires token)
POST   /api/budgets             → Create budget (requires token)
GET    /api/transactions        → Get transactions (requires token)
POST   /api/transactions        → Create transaction (requires token)
```

---

## 🎯 **Summary**

| Aspect | Frontend (React Router) | Backend (Express) |
|--------|------------------------|-------------------|
| **Purpose** | Show pages to user | Process data requests |
| **Routes** | `/dashboard`, `/settings` | `/api/auth/login`, `/api/budgets` |
| **Protection** | `<ProtectedRoute>` | `authenticateToken` middleware |
| **When to Use** | User navigation | Data operations |
| **Returns** | JSX/Components | JSON data |

**Key Takeaway:** React Router handles the UI, Express handles the data. Both need protection, but for different reasons!

---

## 🚀 **Next Steps**

1. Install React Router: `npm install react-router-dom`
2. Create the files from this guide
3. Test the login flow
4. Build your protected pages (dashboard, budgets, etc.)
5. Make authenticated API calls to your backend

Your backend is already secure and ready to go! 🎉
