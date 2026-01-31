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
      <Card className="w-full max-w-md shadow-xl border border-slate-6 bg-slate-1">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-9 rounded-full mb-4">
            <i className="pi pi-lock text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-slate-12 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-11">
            Sign in to continue to Budget App
          </p>
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
                className="w-full block"
                pt={{
                  root: { className: 'w-full' },
                  input: { 
                    className: 'w-full px-4 py-3 bg-slate-1 transition-colors border border-slate-7 rounded-md' 
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
            <a href="#" className="text-blue-11 hover:text-blue-12 p-2 rounded p-ripple relative inline-block">
              Forgot password?
              <Ripple />
            </a>
          </div>

          {/* Login Button */}
          <Button 
            type="submit"
            label="Sign In"
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
        <div className="grid grid-cols-2 gap-3">
          <Button 
            label="Google"
            icon="pi pi-google"
            className="bg-slate-3 hover:bg-slate-4 text-slate-12 border border-slate-6"
          />
          <Button 
            label="GitHub"
            icon="pi pi-github"
            className="bg-slate-3 hover:bg-slate-4 text-slate-12 border border-slate-6"
          />
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-slate-6 text-center">
          <p className="text-slate-11 text-sm">
            Don't have an account?{' '}
            <a href="#" className="text-blue-11 hover:text-blue-12 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Login;
