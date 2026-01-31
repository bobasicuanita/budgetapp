import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Ripple } from 'primereact/ripple';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-2 p-4">
      {/* Gradient border wrapper */}
      <div className="w-full max-w-md p-[4px] bg-gradient-to-b from-blue-9 via-blue-9/50 to-transparent rounded-[1.8rem]">
        <Card className="w-full bg-slate-1 rounded-3xl shadow-none"
        pt={{
          root: { className: 'shadow-none' },
          content: { 
            className: "p-8"
          }
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-9 rounded-full mb-4">
            <i className="pi pi-lock text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-slate-12 mb-2">
            Budget App
          </h1>
          <p className="text-slate-11">
            Sign in to continue to Budget App
          </p>
        </div>

        {/* Error Message */}
        <div className={`mb-4 p-3 bg-red-3 border border-red-7 rounded-md transition-all ${error ? 'block' : 'hidden'}`}>
          <p className="text-red-11 text-sm">{error}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-12 mb-2">
              Email
            </label>
            <div className="input-hover-wrapper">
              <InputText 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
                required
                className="w-full"
                pt={{
                  root: { 
                    className: 'w-full px-4 py-3 bg-slate-1 transition-colors border border-slate-7 rounded-md' 
                  }
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-slate-12 mb-2">
              Password
            </label>
            <div className="input-hover-wrapper">
              <Password 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                toggleMask
                feedback={false}
                required
                className="w-full block"
                pt={{
                  root: { className: 'w-full' },
                  input: { 
                    className: 'w-full px-4 py-3 bg-slate-1 transition-colors border border-slate-7 rounded-md' 
                  },
                  showIcon: { 
                    className: 'focus:outline-none focus:ring-0 focus:shadow-none cursor-pointer text-slate-11 hover:text-slate-12' 
                  },
                  hideIcon: { 
                    className: 'focus:outline-none focus:ring-0 focus:shadow-none cursor-pointer text-slate-11 hover:text-slate-12' 
                  }
                }}
              />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-11 cursor-pointer p-ripple relative">
              <input type="checkbox" className="w-4 h-4 accent-blue-9" />
              Remember me
              <Ripple />
            </label>
            <a href="/forgot-password" className="text-blue-11 hover:text-blue-12 p-2 rounded p-ripple relative inline-block">
              Forgot password?
              <Ripple />
            </a>
          </div>

          {/* Login Button */}
          <Button 
            type="submit"
            label={loading ? "" : "Sign In"}
            icon={loading ? "pi pi-spin pi-spinner" : ""}
            disabled={loading}
            className="w-full bg-blue-9 hover:bg-blue-10 border-0 text-white font-semibold py-3"
          />
        </form>

        {/* Divider with Gradient Fade */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-[2px] rounded-full bg-gradient-to-r from-transparent via-slate-6/50 to-slate-6"></div>
          <span className="text-slate-11 text-sm whitespace-nowrap">Or continue with</span>
          <div className="flex-1 h-[2px] rounded-full bg-gradient-to-l from-transparent via-slate-6/50 to-slate-6"></div>
        </div>

        {/* Social Login */}
        <div className="flex justify-center gap-4">
          <Button 
            icon="pi pi-google"
            rounded
            text
            aria-label="Continue with Google"
            className="w-12 h-12 bg-blue-9 hover:bg-blue-10 text-white border-0"
          />
          <Button 
            icon="pi pi-apple"
            rounded
            text
            aria-label="Continue with Apple"
            className="w-12 h-12 bg-blue-9 hover:bg-blue-10 text-white border-0"
          />
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
    </div>
  );
}

export default Login;
