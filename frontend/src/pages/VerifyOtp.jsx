import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, Title, Text, Flex, Stack, Box, PinInput, Anchor, Loader, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { GmailIcon, OutlookIcon } from '../components/SvgIcons';
import { useRipple } from '../hooks/useRipple';

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const rememberMe = location.state?.rememberMe || false;
  const isMobile = useMediaQuery('(max-width: 576px)');

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showResendSuccess, setShowResendSuccess] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const createRipple = useRipple();

  const verifyMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Clear any errors
      setVerificationError('');
      // Store access token (short-lived)
      localStorage.setItem('accessToken', data.accessToken);
      // Store user info if provided
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      navigate('/dashboard');
    },
    onError: (error) => {
      setVerificationError(error.message);
      setOtp('');
    }
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('http://localhost:5000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || 'Failed to resend code');
        error.status = response.status;
        error.retryAfter = errorData.retryAfter || null;
        throw error;
      }

      return response.json();
    },
    onSuccess: () => {
      setCountdown(60); // Start 60-second countdown
      setShowResendSuccess(true);
      setRateLimitMessage(''); // Clear any rate limit message
    },
    onError: (error) => {
      if (error.status === 429 && error.retryAfter) {
        // Rate limit error - sync frontend countdown with backend
        setCountdown(error.retryAfter);
        setShowResendSuccess(false); // Clear success message
        const minutes = Math.floor(error.retryAfter / 60);
        const seconds = error.retryAfter % 60;
        const timeStr = minutes > 0 
          ? `${minutes} minute${minutes > 1 ? 's' : ''}${seconds > 0 ? ` and ${seconds} seconds` : ''}`
          : `${seconds} second${seconds > 1 ? 's' : ''}`;
        
        setRateLimitMessage(`Please wait. You can request a new code in ${timeStr}.`);
      } else {
        notifications.show({
          title: 'Error',
          message: error.message,
          color: 'red.8',
          withBorder: true,
          withCloseButton: true,
          radius: 'lg',
          styles: {
            title: { color: 'var(--gray-12)' },
            description: { color: 'var(--gray-11)' }
          }
        });
      }
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = () => {
    // Prevent resend if countdown is active
    if (countdown > 0) return;
    resendMutation.mutate();
  };

  const handleOtpChange = (value) => {
    setOtp(value);
    // Clear error only when user starts typing (not when programmatically cleared)
    if (verificationError && value.length > 0) {
      setVerificationError('');
    }
    // Auto-verify when OTP is complete
    if (value.length === 6) {
      verifyMutation.mutate({ email, otp: value, rememberMe });
    }
  };

  return (
    <Flex
      mih="100vh"
      style={{ 
        padding: '40px 0',
        background: 'radial-gradient(circle, var(--blue-2) 0%, var(--blue-6) 50%)'
      }}
      gap="md"
      justify="center"
      align="center"
      direction="column"
      wrap="nowrap"
    >
      
      <Box 
        w={{ base: '90%', xs: 400, sm: 450 }}
        maw={450}
      >
        <Card padding="xl" shadow="md" style={{ backgroundColor: 'white', borderRadius: '10px' }}>
          <Stack gap="lg">
            <Title order={2} ta="center" c="gray.11">Check your email</Title>
            <Text size="sm" ta="center" c="gray.11" fw={400}>
              We sent a 6-digit code to <Text component="span" fw={600}>{email}</Text>
              <br />
              If you don't see the email, check your spam or junk folder.
            </Text>

            <Stack gap="md" align="center">
              {verificationError && (
                <Text size="sm" c="red.8" fw={500}>
                  {verificationError}
                </Text>
              )}
              
              <PinInput 
                length={6}
                value={otp}
                onChange={handleOtpChange}
                size={isMobile ? "md" : "lg"}
                type="number"
                oneTimeCode
                disabled={verifyMutation.isPending}
                className={verificationError ? "otp-input otp-input-error" : "otp-input"}
                autoFocus
                placeholder=""
                gap="xs"
              />
              {verifyMutation.isPending && (
                <Text size="sm" c="blue.8">Verifying...</Text>
              )}

              <Group gap="md" justify="center">
                <Anchor 
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseDown={createRipple}
                  c="gray.11"
                  size="sm"
                  underline="hover"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <GmailIcon size={16} />
                  <span>View in Gmail</span>
                </Anchor>
                <Anchor 
                  href="https://outlook.live.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseDown={createRipple}
                  c="gray.11"
                  size="sm"
                  underline="hover"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <OutlookIcon size={16} />
                  <span>View in Outlook</span>
                </Anchor>
              </Group>
            </Stack>

            <div style={{ 
              width: '100%',
              height: '1px',
              background: 'linear-gradient(to right, transparent, var(--gray-8) 50%, transparent)'
            }} />

            <Stack gap="xs" align="center">
              {showResendSuccess && countdown > 0 && (
                <Text size="sm" c="green.8" fw={500}>
                  Code sent! Check your email for the 6-digit code.
                </Text>
              )}
              
              {rateLimitMessage && countdown > 0 && (
                <Text size="sm" c="yellow.9" fw={500}>
                  {rateLimitMessage}
                </Text>
              )}
              
              <Group justify="center" gap="xs">
                {resendMutation.isPending ? (
                  <>
                    <Loader size="xs" color="blue.8" />
                    <Text size="sm" c="gray.8">Sending...</Text>
                  </>
                ) : countdown > 0 ? (
                  <Text size="sm" c="gray.10">
                    Resend code in <Text component="span" c="gray.11" fw={600}>{countdown}s</Text>
                  </Text>
                ) : (
                  <Group gap={4} justify="center" style={{ flexWrap: 'nowrap' }}>
                    <Text size="sm" c="gray.11">Didn't receive code?</Text>
                    <Anchor 
                      onClick={handleResend}
                      onMouseDown={createRipple}
                      c="blue.8"
                      size="sm"
                      underline="hover"
                      style={{ cursor: 'pointer' }}
                    >
                      Resend new code.
                    </Anchor>
                  </Group>
                )}
              </Group>
            </Stack>

            <Group justify="center">
              <Anchor 
                onClick={() => navigate('/login')}
                onMouseDown={createRipple}
                c="gray.11"
                size="sm"
                underline="hover"
                style={{ cursor: 'pointer', fontWeight: 500 }}
              >
                ← Go back to login
              </Anchor>
            </Group>
          </Stack>
        </Card>
      </Box>
    </Flex>
  );
}

export default VerifyOtp;
