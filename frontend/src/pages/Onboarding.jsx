import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Steps } from 'primereact/steps';
import { Toast } from 'primereact/toast';
import { POPULAR_CURRENCIES, ALL_CURRENCIES } from '../data/currencies';

function Onboarding() {
  const navigate = useNavigate();
  const toast = useRef(null);
  
  const [activeStep, setActiveStep] = useState(0);
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form data
  const [baseCurrency, setBaseCurrency] = useState(null);
  const [walletType, setWalletType] = useState('cash');
  const [walletName, setWalletName] = useState('');
  const [startingBalance, setStartingBalance] = useState(0);

  const steps = [
    { label: 'Currency' },
    { label: 'First Wallet' }
  ];

  const walletTypes = [
    { value: 'cash', label: 'Cash', icon: '💵', description: 'Physical money' },
    { value: 'bank', label: 'Bank', icon: '🏦', description: 'Bank account' },
    { value: 'credit_card', label: 'Credit Card', icon: '💳', description: 'Credit card' },
    { value: 'savings', label: 'Savings', icon: '💰', description: 'Savings account' }
  ];

  // Complete onboarding mutation
  const completeMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete onboarding');
      }

      return response.json();
    },
    onSuccess: () => {
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message,
        life: 5000
      });
    }
  });

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate currency selected
      if (!baseCurrency) {
        toast.current.show({
          severity: 'warn',
          summary: 'Required',
          detail: 'Please select your primary currency',
          life: 3000
        });
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Complete onboarding
      handleComplete();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleComplete = () => {
    // Validate wallet data
    if (startingBalance === null || startingBalance === undefined) {
      toast.current.show({
        severity: 'warn',
        summary: 'Required',
        detail: 'Please enter a starting balance',
        life: 3000
      });
      return;
    }

    const data = {
      base_currency: baseCurrency,
      wallet: {
        type: walletType,
        name: walletName || undefined, // Let backend use default if empty
        starting_balance: startingBalance
      }
    };

    completeMutation.mutate(data);
  };

  // Filter currencies for search
  const displayedCurrencies = showAllCurrencies
    ? ALL_CURRENCIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_CURRENCIES;

  return (
    <div className="min-h-screen bg-slate-1 flex items-center justify-center p-4">
      <Toast ref={toast} />
      
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-12 mb-2">Welcome to BudgetApp</h1>
          <p className="text-slate-11">Let's set up your account</p>
        </div>

        {/* Steps */}
        <Steps
          model={steps}
          activeIndex={activeStep}
          className="mb-8"
          pt={{
            menuitem: { className: 'cursor-pointer' }
          }}
        />

        {/* Step Content */}
        <Card className="shadow-lg">
          {/* STEP 1: Currency Selection */}
          {activeStep === 0 && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-12 mb-2">
                What's your primary currency?
              </h2>
              <p className="text-slate-11 mb-6">
                This will be used for reports and total net worth display
              </p>

              {/* Search (only when showing all) */}
              {showAllCurrencies && (
                <div className="mb-4">
                  <span className="p-input-icon-left w-full">
                    <i className="pi pi-search" />
                    <InputText
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search currencies..."
                      className="w-full"
                    />
                  </span>
                </div>
              )}

              {/* Currency List */}
              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {displayedCurrencies.map(currency => (
                  <div
                    key={currency.code}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      baseCurrency === currency.code
                        ? 'border-blue-9 bg-blue-2'
                        : 'border-slate-7 hover:border-slate-8 hover:bg-slate-2'
                    }`}
                    onClick={() => setBaseCurrency(currency.code)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{currency.flag}</span>
                        <div>
                          <div className="font-semibold text-slate-12">
                            {currency.symbol} {currency.code}
                          </div>
                          <div className="text-sm text-slate-11">{currency.name}</div>
                        </div>
                      </div>
                      {baseCurrency === currency.code && (
                        <i className="pi pi-check text-blue-9 text-xl" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Show All Toggle */}
              {!showAllCurrencies && (
                <Button
                  label="Show all currencies"
                  icon="pi pi-list"
                  text
                  className="w-full mb-4"
                  onClick={() => setShowAllCurrencies(true)}
                />
              )}
            </div>
          )}

          {/* STEP 2: First Wallet */}
          {activeStep === 1 && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-12 mb-2">
                Add your first wallet
              </h2>
              <p className="text-slate-11 mb-6">
                Where do you keep your money?
              </p>

              {/* Wallet Type Selection */}
              <label className="block mb-2 font-semibold text-slate-12">Wallet Type *</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {walletTypes.map(type => (
                  <div
                    key={type.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      walletType === type.value
                        ? 'border-blue-9 bg-blue-2'
                        : 'border-slate-7 hover:border-slate-8 hover:bg-slate-2'
                    }`}
                    onClick={() => setWalletType(type.value)}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">{type.icon}</div>
                      <div className="font-semibold text-slate-12">{type.label}</div>
                      <div className="text-xs text-slate-11">{type.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Wallet Name (Optional) */}
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-slate-12">
                  Wallet Name <span className="text-slate-11 font-normal">(optional)</span>
                </label>
                <InputText
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder={`My ${walletTypes.find(t => t.value === walletType)?.label || 'Wallet'}`}
                  className="w-full"
                />
                <small className="text-slate-11">
                  Leave empty to use default name
                </small>
              </div>

              {/* Starting Balance */}
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-slate-12">
                  Starting Balance *
                </label>
                <InputNumber
                  value={startingBalance}
                  onValueChange={(e) => setStartingBalance(e.value)}
                  mode="currency"
                  currency={baseCurrency}
                  locale="en-US"
                  placeholder="0.00"
                  className="w-full"
                  pt={{
                    root: { className: 'w-full' },
                    input: { className: 'w-full' }
                  }}
                />
                <small className="text-slate-11">
                  How much money do you currently have in this wallet?
                  {walletType === 'credit_card' && ' (Enter negative amount if you owe money)'}
                </small>
              </div>

              {/* Info Box */}
              <div className="bg-blue-2 border border-blue-7 rounded-lg p-4 mb-4">
                <div className="flex gap-2">
                  <i className="pi pi-info-circle text-blue-9 mt-1" />
                  <div className="text-sm text-slate-12">
                    <strong>Don't worry about exact amounts.</strong> You can adjust your balance
                    anytime, and add more wallets later.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 px-6 pb-6">
            {activeStep > 0 && (
              <Button
                label="Back"
                icon="pi pi-arrow-left"
                className="flex-1"
                severity="secondary"
                onClick={handleBack}
                disabled={completeMutation.isPending}
              />
            )}
            <Button
              label={activeStep === 1 ? (completeMutation.isPending ? 'Completing...' : 'Complete Setup') : 'Continue'}
              icon={completeMutation.isPending ? 'pi pi-spin pi-spinner' : 'pi pi-arrow-right'}
              iconPos="right"
              className="flex-1 bg-blue-9 hover:bg-blue-10"
              onClick={handleNext}
              disabled={completeMutation.isPending}
            />
          </div>
        </Card>

        {/* Skip option */}
        <div className="text-center mt-4">
          <button
            className="text-slate-11 hover:text-slate-12 text-sm underline"
            onClick={() => navigate('/dashboard')}
            disabled={completeMutation.isPending}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
