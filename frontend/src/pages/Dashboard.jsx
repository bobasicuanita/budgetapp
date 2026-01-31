import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  // Fetch current user data with authentication
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token invalid or expired - logout
          localStorage.removeItem('token');
          navigate('/login');
        }
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      return data.user;
    }
  });

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    // Remove token and redirect
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading user data</div>;

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <div>
          <span>Welcome, {user?.name}!</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav>
        <a href="/budgets">Budgets</a>
        <a href="/transactions">Transactions</a>
        <a href="/settings">Settings</a>
      </nav>

      <main>
        <h2>Your Budget Overview</h2>
        <p>Email: {user?.email}</p>
        <p>Account created: {new Date(user?.createdAt).toLocaleDateString()}</p>
        {/* Add your dashboard content here */}
      </main>
    </div>
  );
}

export default Dashboard;
