import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Title, Text, TextInput, Flex, Button, Stack, Box, Stepper, Select, NumberInput, Group, Anchor, Card, Checkbox, Loader } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { FaUser, FaDollarSign, FaWallet } from 'react-icons/fa';
// Colors are now accessed via CSS variables (var(--color-name))
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useRipple } from '../hooks/useRipple';
import { authenticatedFetch } from '../utils/api';
import { validateName } from '../utils/validators';
import { GROUPED_CURRENCY_OPTIONS, ALL_CURRENCIES, getCurrencySymbol } from '../data/currencies';
import { WALLET_TYPES } from '../data/walletTypes';
import { CountryFlag } from '../components/CountryFlag';
import { getCurrencyDecimals, getCurrencyDecimalInfo, getMaxAmountDisplay, exceedsMaxAmount, getMaxAmountString } from '../utils/amountValidation';
import { IconAlertTriangle } from '@tabler/icons-react';

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createRipple = useRipple();
  const isMobile = useMediaQuery('(max-width: 550px)');

  // Check if user has already completed onboarding
  const { data: onboardingStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/onboarding/status');
      if (!response.ok) {
        throw new Error('Failed to fetch onboarding status');
      }
      return response.json();
    },
    retry: 1,
    staleTime: 0, // Always fetch fresh data
  });

  // Redirect to dashboard if already completed onboarding
  useEffect(() => {
    if (onboardingStatus?.completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [onboardingStatus, navigate]);
  
  const [activeStep, setActiveStep] = useState(0);
  
  // Form data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [walletName, setWalletName] = useState('');
  const [startingBalance, setStartingBalance] = useState(0);
  const [includeInBalance, setIncludeInBalance] = useState(true);

  const handleNameChange = (value, setter) => {
    // Only update if the value is valid
    if (validateName(value)) {
      setter(value);
    }
  };

  const completeMutation = useMutation({
    mutationFn: async (data) => {
      const response = await authenticatedFetch('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete onboarding');
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch onboarding status cache before navigating
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      await queryClient.refetchQueries({ queryKey: ['onboarding-status'] });
      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    },
  });

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleComplete = () => {
    const data = {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      base_currency: baseCurrency,
      wallet: {
        type: walletType,
        name: walletName || undefined,
        starting_balance: startingBalance ?? 0, // Default to 0 if empty
        include_in_balance: includeInBalance
      }
    };

    completeMutation.mutate(data);
  };

  // Handle Enter key press to move to next step
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        // Check if button should be disabled
        const isDisabled = completeMutation.isPending ||
                          (activeStep === 1 && !baseCurrency) ||
                          (activeStep === 2 && (!walletType || exceedsMaxAmount(startingBalance, baseCurrency)));
        
        if (!isDisabled) {
          if (activeStep === 0) {
            setActiveStep(1);
          } else if (activeStep === 1) {
            setActiveStep(2);
          } else if (activeStep === 2) {
            handleComplete();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeStep, baseCurrency, completeMutation.isPending, firstName, lastName, walletType, walletName, startingBalance]);

  // Animation variants for step transitions
  const stepVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  // Show loading while checking onboarding status
  if (isCheckingStatus) {
    return (
      <Flex
        mih="100vh"
        style={{ 
          background: 'radial-gradient(circle, var(--blue-2) 0%, var(--blue-6) 50%)'
        }}
        justify="center"
        align="center"
      >
        <Loader color="blue.9" size="lg" />
      </Flex>
    );
  }

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
  
      {/* Stepper and Content Container */}
      <Box 
        w={{ base: '90%', xs: 400, sm: 600 }}
        maw={600}
      >
        <Card padding="xl" shadow="md" style={{ backgroundColor: 'white', borderRadius: '10px' }}>
          <Stack gap="lg">
            {/* Stepper */}
            <Stepper 
              active={activeStep} 
              iconSize={42} 
              color="green.7" 
              size="sm"
              styles={{
                stepIcon: {
                  color: '#1c2024', // gray.12
                }
              }}
            >
              <Stepper.Step label={isMobile ? undefined : "Name"} icon={<FaUser />} />
              <Stepper.Step label={isMobile ? undefined : "Currency"} icon={<FaDollarSign />} />
              <Stepper.Step label={isMobile ? undefined : "Wallet"} icon={<FaWallet />} />
            </Stepper>

            {/* Animated Step Content */}
            <Box style={{ height: '440px', position: 'relative' }} w={{ base: '90%', sm: 400 }} mx="auto" mt="60px">
              <AnimatePresence mode="wait" custom={activeStep}>
                {activeStep === 0 && (
                  <motion.div
                    key="step1"
                    custom={activeStep}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Stack 
                      gap="lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          if (!completeMutation.isPending) {
                            handleNext();
                          }
                        }
                      }}
                    >
                      <Title order={1} ta="center" c="gray.11">What's your name?</Title>
                      <Text size="sm" ta="center" c="gray.11" fw={400}>
                        This helps us personalize your experience and lets you manage multiple family accounts in the future.
                      </Text>
                      
                      <TextInput
                        label="First Name (Optional)"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                        className="text-input"
                        size="md"
                        autoFocus
                        maxLength={50}
                        styles={{
                          label: { fontSize: '12px', fontWeight: 500 }
                        }}
                      />
                      
                      <TextInput
                        label="Last Name (Optional)"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => handleNameChange(e.target.value, setLastName)}
                        className="text-input"
                        size="md"
                        maxLength={50}
                        styles={{
                          label: { fontSize: '12px', fontWeight: 500 }
                        }}
                      />
                    </Stack>
                  </motion.div>
                )}

                {activeStep === 1 && (
                  <motion.div
                    key="step2"
                    custom={activeStep}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Stack 
                      gap="lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          if (!completeMutation.isPending && baseCurrency) {
                            handleNext();
                          }
                        }
                      }}
                    >
                      <Title order={1} ta="center" c="gray.11">Choose Your Currency</Title>
                      <Text size="sm" ta="center" c="gray.11" fw={400}>
                        Your default currency will be used for charts and summaries.
                      </Text>
                      
                      <Select
                        label="Currency"
                        placeholder="Select currency"
                        value={baseCurrency}
                        onChange={setBaseCurrency}
                        data={GROUPED_CURRENCY_OPTIONS}
                        searchable
                        clearable
                        size="md"
                        autoFocus
                        className={baseCurrency ? 'text-input currency-select-with-flag' : 'text-input'}
                        maxDropdownHeight={200}
                        comboboxProps={{ 
                          position: 'bottom',
                          middlewares: { flip: false, shift: false },
                          withinPortal: true
                        }}
                        onSearchChange={(query) => {
                          // Clear selection if user manually erases all text
                          if (query === '' && baseCurrency) {
                            setBaseCurrency(null);
                          }
                        }}
                        leftSection={
                          baseCurrency ? (
                            <CountryFlag 
                              countryCode={ALL_CURRENCIES.find(c => c.code === baseCurrency)?.countryCode} 
                              size={16} 
                            />
                          ) : null
                        }
                        leftSectionPointerEvents="none"
                        styles={{
                          label: { fontSize: '12px', fontWeight: 500 },
                          groupLabel: { color: '#687076' } // slate.10
                        }}
                        renderOption={({ option }) => (
                          <Group gap="xs">
                            <CountryFlag countryCode={option.countryCode} size={16} />
                            <span>{option.label}</span>
                          </Group>
                        )}
                      />
                    </Stack>
                  </motion.div>
                )}

                {activeStep === 2 && (
                  <motion.div
                    key="step3"
                    custom={activeStep}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Stack 
                      gap="lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          const isDisabled = completeMutation.isPending || !walletType || exceedsMaxAmount(startingBalance, baseCurrency);
                          if (!isDisabled) {
                            handleNext();
                          }
                        }
                      }}
                    >
                      <Title order={1} ta="center" c="gray.11">Create Your First Wallet</Title>
                      <Text size="sm" ta="center" c="gray.11" fw={400}>
                        A wallet is any place you keep money - bank, cash or digital. You can create more later.
                      </Text>
                      
                      <TextInput
                        label="Wallet Name (Optional)"
                        placeholder="e.g., Main Checking"
                        value={walletName}
                        onChange={(e) => setWalletName(e.target.value)}
                        className="text-input"
                        size="md"
                        autoFocus
                        maxLength={32}
                        styles={{
                          label: { fontSize: '12px', fontWeight: 500 }
                        }}
                      />
                      
                      <Select
                        label="Wallet Type"
                        placeholder="Select wallet type"
                        value={walletType}
                        onChange={setWalletType}
                        data={WALLET_TYPES}
                        size="md"
                        clearable
                        className="text-input"
                        styles={{
                          label: { fontSize: '12px', fontWeight: 500 }
                        }}
                      />
                      
                      <NumberInput
                        label="Starting Balance (Optional)"
                        placeholder={baseCurrency ? (getCurrencyDecimals(baseCurrency) === 0 ? "0" : "0." + "0".repeat(getCurrencyDecimals(baseCurrency))) : "0.00"}
                        value={startingBalance}
                        onChange={setStartingBalance}
                        onBlur={(e) => {
                          // Get the raw string value from the input to avoid floating point precision loss
                          const rawValue = e.target.value?.replace(/,/g, '').replace(/[^\d.]/g, '');
                          
                          // Auto-correct to max if exceeded (check raw string value)
                          if (rawValue && baseCurrency && exceedsMaxAmount(rawValue, baseCurrency)) {
                            setStartingBalance(getMaxAmountString(baseCurrency));
                          }
                        }}
                        decimalScale={baseCurrency ? getCurrencyDecimals(baseCurrency) : 2}
                        fixedDecimalScale={baseCurrency ? getCurrencyDecimals(baseCurrency) > 0 : true}
                        thousandSeparator=","
                        min={0}
                        size="md"
                        className="text-input"
                        prefix={baseCurrency ? getCurrencySymbol(baseCurrency) + ' ' : ''}
                        styles={{
                          label: { fontSize: '12px', fontWeight: 500 }
                        }}
                      />
                      
                      {/* Currency decimal info message */}
                      {(() => {
                        const decimalInfo = baseCurrency ? getCurrencyDecimalInfo(baseCurrency) : null;
                        const hasValue = startingBalance && parseFloat(startingBalance) > 0;
                        return decimalInfo && hasValue ? (
                          <Text size="xs" c="gray.9" style={{ marginTop: '-8px' }}>
                            {decimalInfo}
                          </Text>
                        ) : null;
                      })()}
                      
                      {/* Balance overflow warning */}
                      {(() => {
                        if (!startingBalance || !baseCurrency) return null;
                        return exceedsMaxAmount(startingBalance, baseCurrency) ? (
                          <Group gap="xs" wrap="nowrap" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                            <IconAlertTriangle size={16} color="var(--red-9)" style={{ flexShrink: 0 }} />
                            <Text size="xs" c="red.9">
                              Balance exceeds maximum allowed amount of {getMaxAmountDisplay(baseCurrency)}
                            </Text>
                          </Group>
                        ) : null;
                      })()}
                      
                      <Box>
                        <Checkbox
                          label="Available for spending"
                          checked={includeInBalance}
                          onChange={(event) => setIncludeInBalance(event.currentTarget.checked)}
                          size="sm"
                          color="blue.8"
                        />
                        <Text size="xs" c="gray.9" mt={4} ml={28}>
                          Used to calculate how much money you have available to spend.
                        </Text>
                      </Box>
                    </Stack>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>

            {/* Navigation Buttons */}
            <Stack gap="sm" w={{ base: '90%', sm: 400 }} mx="auto">
              <Button
                onClick={handleNext}
                onMouseDown={createRipple}
                color="blue.9"
                size="md"
                fullWidth
                loading={completeMutation.isPending}
                disabled={
                  completeMutation.isPending || 
                  (activeStep === 1 && !baseCurrency) || 
                  (activeStep === 2 && (!walletType || exceedsMaxAmount(startingBalance, baseCurrency)))
                }
              >
                {activeStep === 2 ? 'Start' : 'Continue'}
              </Button>
              
              <Box ta="center" style={{ height: '28px' }}>
                {activeStep > 0 && (
                  <Anchor
                    onClick={handleBack}
                    onMouseDown={createRipple}
                    c="gray.11"
                    size="md"
                    style={{ cursor: 'pointer', fontWeight: 500 }}
                    disabled={completeMutation.isPending}
                  >
                    Back
                  </Anchor>
                )}
              </Box>
            </Stack>
          </Stack>
        </Card>
      </Box>
    </Flex>
  );
}

export default Onboarding;
