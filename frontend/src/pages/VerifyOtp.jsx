import { Card } from 'primereact/card';
import { InputOtp } from 'primereact/inputotp';
import { Toast } from 'primereact/toast';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import '../App.css';

function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useRef(null);
  const email = location.state?.email || '';

  // Verify OTP mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ email, otp }) => {
      
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      return data;
    },
    onSuccess: (data) => {
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Redirect to dashboard
      navigate('/dashboard')
    },
    onError: (error) => {
      // Show error toast
      toast.current.show({
        severity: 'error',
        summary: 'Verification Failed',
        detail: error.message,
        life: 5000
      });
      // Clear OTP on error
      setOtp('');
    }
  });

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    if (otp && otp.length === 6 && !verifyMutation.isPending) {
      verifyMutation.mutate({ email, otp });
    }
  }, [otp, email, verifyMutation]);

  // Redirect to login if no email
  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleResend = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        toast.current.show({
          severity: 'info',
          summary: 'Code Sent',
          detail: 'A new verification code has been sent to your email.',
          life: 3000
        });
        setOtp('');
      }
    } catch (err) {
      console.error('Resend error:', err);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to resend code.',
        life: 3000
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-2 p-4">
      <Toast ref={toast} />
      
      {/* Gradient border wrapper */}
      <div className="w-full max-w-lg p-[4px] bg-gradient-to-b from-blue-9 via-blue-9/50 to-transparent rounded-[1.8rem]">
        <Card className="w-full bg-slate-1 rounded-3xl shadow-none"
        pt={{
          root: { className: 'shadow-none' },
          content: { 
            className: "p-8"
          }
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-9 rounded-full mb-4">
            <i className="pi pi-envelope text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-slate-12 mb-2">
            Check Your Email
          </h1>
          <p className="text-slate-11 mb-2">
            We sent a code to
          </p>
          <p className="text-slate-12 font-medium">
            {email}
          </p>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-12 text-center mb-4">
            Enter the 6-digit code
          </label>
          <div className="flex justify-center">
            <InputOtp 
              value={otp} 
              onChange={(e) => setOtp(e.value)}
              length={6}
              integerOnly
              disabled={verifyMutation.isPending}
            />
          </div>
          
          {/* Loading indicator */}
          {verifyMutation.isPending && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <i className="pi pi-spin pi-spinner text-blue-9"></i>
              <span className="text-slate-11 text-sm">Verifying...</span>
            </div>
          )}
        </div>

        {/* Resend Code */}
        <div className="text-center">
          <p className="text-slate-11 text-sm mb-2">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResend}
            className="text-blue-11 hover:text-blue-12 font-medium text-sm"
          >
            Resend code
          </button>
        </div>

        {/* Back to Login */}
        <div className="mt-6 pt-6 border-t border-slate-6 text-center">
          <a href="/login" className="text-slate-11 hover:text-slate-12 text-sm">
            ← Back to login
          </a>
        </div>
      </Card>
      </div>
    </div>
  );
}

export default VerifyOtp;
