import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import '../App.css';

function Login() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const toast = useRef(null);

  // Login mutation using React Query
  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const response = await fetch('http://localhost:5000/api/auth/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      return data;
    },
    onSuccess: (data) => {
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Show success message
      toast.current.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Login successful!',
        life: 2000
      });
      
      // Redirect to dashboard after brief delay
      setTimeout(() => navigate('/dashboard'), 500);
    },
    onError: (error) => {
      // Show error toast
      toast.current.show({
        severity: 'error',
        summary: 'Login Failed',
        detail: error.message,
        life: 5000
      });
    }
  });

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-2 p-4">
      <Toast ref={toast} />
      
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

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Input */}
          <div>

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

          {/* Login Button */}
          <Button 
            type="submit"
            label={loginMutation.isPending ? "" : "Continue with Email"}
            icon={loginMutation.isPending ? "pi pi-spin pi-spinner" : ""}
            disabled={loginMutation.isPending}
            className="w-full bg-blue-9 hover:bg-blue-10 border-0 text-white font-semibold py-3"
          />
        </form>

        {/* Divider with Gradient Fade */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-[2px] rounded-full bg-gradient-to-r from-transparent via-slate-6/50 to-slate-6"></div>
          <span className="text-slate-11 text-sm whitespace-nowrap">Or sign in with</span>
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
            icon="pi pi-facebook"
            rounded
            text
            aria-label="Continue with Facebook"
            className="w-12 h-12 bg-blue-9 hover:bg-blue-10 text-white border-0"
          />
        </div>

      </Card>
      </div>
    </div>
  );
}

export default Login;
