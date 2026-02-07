import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, Title, Text, TextInput, Flex, Button, Stack, Popover, Box, Checkbox, Group } from '@mantine/core';
import { IoWarning } from 'react-icons/io5';
import { GoogleIcon, FacebookIcon } from '../components/SvgIcons';
// Colors are now accessed via CSS variables (var(--color-name))
import { useRipple } from '../hooks/useRipple';
import { validateEmail } from '../utils/validators';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const createRipple = useRipple();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error and close popover when user starts typing
    if (emailError) {
      setEmailError('');
      setShowPopover(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('http://localhost:5000/api/auth/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });


      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      return response.json();
    },
    onSuccess: () => {
      navigate('/verify-otp', { state: { email, rememberMe } });
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Validate email
    if (!email) {
      setEmailError('Please enter your email address');
      setShowPopover(true);
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      setShowPopover(true);
      return;
    }
    
    loginMutation.mutate({ email, rememberMe });
  };

  return (
    <Flex
      mih="100vh"
      direction={{ base: 'column', md: 'row' }}
      wrap="nowrap"
    >
      {/* Left Side - Full width on mobile, 50% on desktop with centered login box */}
      <Flex
        style={{ 
          flex: '1',
          minHeight: '100vh',
          backgroundColor: 'var(--blue-2)',
          padding: '40px 20px'
        }}
        justify="center"
        align="center"
      >
        <Box 
          w={{ base: '90%', xs: 400, sm: 450 }}
          maw={450}
        >
          <Card padding="xl" shadow="md" style={{ backgroundColor: 'white', borderRadius: '10px' }}>
            <Stack gap="lg">
          <Title order={1} ta="center" c="gray.11">Welcome!</Title>
          <Text size="sm" ta="center" c="gray.10" fw={500}>
            Enter your email to receive a login code
          </Text>
          <Popover 
            opened={showPopover && !!emailError} 
            onChange={setShowPopover}
            closeOnClickOutside
            position="top" 
            withArrow 
            shadow="md"
          >
            <Popover.Target>
              <div>
                <TextInput
                  label="Email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit(e);
                    }
                  }}
                  className="text-input"
                  size='md'
                  disabled={loginMutation.isPending}
                  styles={{
                    label: { fontSize: '12px', fontWeight: 500 }
                  }}
                />
              </div>
            </Popover.Target>
            <Popover.Dropdown>
              <Group gap="xs">
                <IoWarning size={18} color="var(--yellow-10)" />
                <Text size="sm" c="gray.8">{emailError}</Text>
              </Group>
            </Popover.Dropdown>
          </Popover>
          
          <Checkbox
            label="Remember me for 30 days"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.currentTarget.checked)}
            size="sm"
            color="blue.8"  
            fw={500}
            styles={{
              label: { color: 'var(--gray-12)', fontSize: '14px' }
            }}
          />
          
          <Button 
            onClick={handleSubmit}
            onMouseDown={createRipple}
            color="blue.8"
            size="md"
            fullWidth
            disabled={loginMutation.isPending}
            loading={loginMutation.isPending}
            radius="md"
            fw={400}
          >
            Continue with Email
          </Button>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            width: '100%'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(to right, transparent, var(--gray-8))'
            }} />
            <Text size="sm" c="gray.10" style={{ whiteSpace: 'nowrap' }}>
              Or continue with
            </Text>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(to left, transparent, var(--gray-8))'
            }} />
          </div>
          
          <Stack gap="sm">
            <Button
              variant="outline"
              size="md"
              fullWidth
              leftSection={<GoogleIcon size={20} />}
              onClick={() => console.log('Google login')}
              onMouseDown={createRipple}
              disabled={loginMutation.isPending}
              styles={{
                root: {
                  borderColor: 'var(--gray-8)',
                  color: 'var(--gray-12)',
                  '&:hover': {
                    borderColor: 'var(--blue-10)',
                    backgroundColor: 'transparent'
                  }
                }
              }}
            >
              Sign in with Google
            </Button>
            <Button
              variant="outline"
              color="gray.11"
              size="md"
              fullWidth
              leftSection={<FacebookIcon size={20} />}
              onClick={() => console.log('Facebook login')}
              onMouseDown={createRipple}
              disabled={loginMutation.isPending}
              styles={{
                root: {
                  borderColor: 'var(--gray-8)',
                  color: 'var(--gray-12)',
                  '&:hover': {
                    borderColor: 'var(--blue-10)',
                    backgroundColor: 'transparent'
                  }
                }
              }}
            >
              Sign in with Facebook
            </Button>
          </Stack>
          </Stack>
        </Card>
      </Box>
    </Flex>
    
    {/* Right Side - 50% with linear gradient background - Hidden on mobile */}
    <Box
      visibleFrom="md"
      style={{ 
        flex: '1',
        minHeight: '100vh',
        background: 'linear-gradient(90deg, var(--blue-2) 0%, var(--blue-6) 50%)'
      }}
    />
  </Flex>
  );
}

export default Login;
