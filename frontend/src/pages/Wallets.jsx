import AppLayout from "../components/AppLayout";
import {
  Text,
  Stack,
  Group,
  Loader,
  Accordion,
  Box,
  Button,
  Tooltip,
  Divider,
} from "@mantine/core";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "../utils/api";
import { WALLET_TYPES } from "../data/walletTypes";
import { formatCurrency } from "../data/currencies";
import { IconArrowsExchange, IconWallet } from "@tabler/icons-react";
import { useRipple } from "../hooks/useRipple";
import { useWallets } from "../hooks/useWallets";
import { useReferenceData } from "../hooks/useReferenceData";
import {
  getMaxAmountDisplay,
  exceedsMaxAmount,
  getMaxAmountString,
  MAX_AMOUNT,
} from "../utils/amountValidation";
import {
  showSuccessNotification,
  showErrorNotification,
} from "../utils/notifications";
import {
  ArchivedWalletsManager,
  ArchiveWalletModal,
  WalletDrawer,
} from "../components/wallets";
import { TransactionDrawer } from "../components/transactions";
import { v4 as uuidv4 } from "uuid";
import "../styles/navigation.css";
import "../styles/inputs.css";

import LiquiditySummaryBox from "../components/wallets/LiquiditySummaryBox";
import WalletItem from "../components/wallets/WalletItem";
import { LI } from "country-flag-icons/react/3x2";
import WalletTypeDistributionPieChart from "../components/wallets/WalletTypeDistributionPieChart";

function Wallets() {
  const createRipple = useRipple();
  const queryClient = useQueryClient();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [archiveConfirmModalOpened, setArchiveConfirmModalOpened] =
    useState(false);
  const [walletToArchive, setWalletToArchive] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Transaction drawer state
  const [transactionDrawerOpened, setTransactionDrawerOpened] = useState(false);
  const [transferFromWallet, setTransferFromWallet] = useState(null);
  const [transactionType, setTransactionType] = useState("transfer");
  const [amount, setAmount] = useState("");
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [transactionDescription, setTransactionDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4());
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [exchangeRateInfo, setExchangeRateInfo] = useState(null);
  const [manualExchangeRate, setManualExchangeRate] = useState("");
  const [checkingExchangeRate, setCheckingExchangeRate] = useState(false);
  const [quickDateSelection, setQuickDateSelection] = useState("today");
  const amountInputRef = useRef(null);

  const { data, isLoading, error } = useWallets();
  const { data: referenceData, isLoading: referenceLoading } =
    useReferenceData();

  // Check if there are any archived wallets
  const [hasArchivedWallets, setHasArchivedWallets] = useState(false);

  // Check for archived wallets on mount and after archiving
  useEffect(() => {
    const checkArchivedWallets = async () => {
      try {
        const response = await authenticatedFetch("/api/wallets/archived/list");
        if (response.ok) {
          const responseData = await response.json();
          setHasArchivedWallets(responseData.count > 0);
        }
      } catch (error) {
        console.error("Error checking archived wallets:", error);
      }
    };
    checkArchivedWallets();
  }, [data]); // Re-check when wallets data changes

  // Check exchange rate for transfers
  const checkExchangeRate = useCallback(
    async (dateToCheck, currencyToCheck) => {
      if (!dateToCheck || !currencyToCheck) return;

      const dateObj =
        dateToCheck instanceof Date ? dateToCheck : new Date(dateToCheck);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      setCheckingExchangeRate(true);

      try {
        const response = await authenticatedFetch(
          `/api/exchange-rates/availability?date=${formattedDate}&currency=${currencyToCheck}`,
        );

        if (response.ok) {
          const responseData = await response.json();
          setExchangeRateInfo(responseData);

          if (responseData.exactMatch || !responseData.requiresManualInput) {
            setManualExchangeRate("");
          }
        } else {
          console.error("Failed to check exchange rate");
          setExchangeRateInfo(null);
        }
      } catch (error) {
        console.error("Error checking exchange rate:", error);
        setExchangeRateInfo(null);
      } finally {
        setCheckingExchangeRate(false);
      }
    },
    [],
  );

  // Check exchange rate when transfer wallets or date change
  useEffect(() => {
    if (!transactionDrawerOpened) return;

    const fromWallet = data?.wallets?.find(
      (w) => w.id === parseInt(fromWalletId),
    );
    const toWallet = data?.wallets?.find((w) => w.id === parseInt(toWalletId));

    if (fromWallet && toWallet && fromWallet.currency !== toWallet.currency) {
      checkExchangeRate(transactionDate, fromWallet.currency);
    } else {
      setExchangeRateInfo(null);
      setManualExchangeRate("");
    }
  }, [
    transactionDrawerOpened,
    transactionDate,
    fromWalletId,
    toWalletId,
    data,
    checkExchangeRate,
  ]);

  // Compute max allowed amount for transfers
  const maxAllowedAmount = useMemo(() => {
    if (!data?.wallets || data.totalLiquidity === undefined) return MAX_AMOUNT;

    let walletCurrency = data.baseCurrency || "USD";
    if (fromWalletId) {
      const fromWallet = data.wallets.find(
        (w) => w.id.toString() === fromWalletId,
      );
      if (fromWallet) {
        walletCurrency = fromWallet.currency;
      }
    }

    return parseFloat(getMaxAmountString(walletCurrency));
  }, [fromWalletId, data]);

  // Compute amount overflow warning
  const amountOverflowWarning = useMemo(() => {
    if (!amount || !data?.wallets || data.totalLiquidity === undefined)
      return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    let walletCurrency = data.baseCurrency || "USD";
    if (fromWalletId) {
      const fromWallet = data.wallets.find(
        (w) => w.id.toString() === fromWalletId,
      );
      if (fromWallet) {
        walletCurrency = fromWallet.currency;
      }
    }

    if (exceedsMaxAmount(amount, walletCurrency)) {
      return {
        type: "amount_overflow",
        maxAllowedString: getMaxAmountString(walletCurrency),
        maxAllowedDisplay: getMaxAmountDisplay(walletCurrency),
        currency: walletCurrency,
        message: `Maximum transaction amount for ${walletCurrency} is ${getMaxAmountDisplay(walletCurrency)}`,
      };
    }

    return null;
  }, [amount, fromWalletId, data]);

  const archiveWalletMutation = useMutation({
    mutationFn: async (walletId) => {
      const response = await authenticatedFetch(
        `/api/wallets/${walletId}/archive`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to archive wallet");
      }

      return response.json();
    },
    onSuccess: () => {
      // Close modal and drawer
      setArchiveConfirmModalOpened(false);
      setWalletToArchive(null);
      handleCloseDrawer();

      // Show success notification
      showSuccessNotification("Wallet archived successfully");

      // Invalidate and refetch wallets and transactions
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => {
      showErrorNotification(error.message);
    },
  });

  // Create transfer transaction mutation
  const createTransferMutation = useMutation({
    mutationFn: async (transactionData) => {
      if (!idempotencyKey) {
        throw new Error("Idempotency key is missing. Please try again.");
      }

      const response = await authenticatedFetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transfer");
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate queries first to refresh data
      await queryClient.invalidateQueries({ queryKey: ["wallets"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });

      // Then show notification and close drawer
      showSuccessNotification("Transfer created successfully");
      handleCloseTransactionDrawer();
    },
    onError: (error) => {
      showErrorNotification(error.message);
    },
  });

  const handleArchiveWallet = (wallet) => {
    setWalletToArchive(wallet);
    setArchiveConfirmModalOpened(true);
  };

  const handleConfirmArchive = () => {
    if (walletToArchive) {
      archiveWalletMutation.mutate(walletToArchive.id);
    }
  };

  // Transfer from wallet handler
  const handleTransferFromWallet = (wallet) => {
    // Set transfer-specific state BEFORE opening drawer
    setTransactionType("transfer");
    setFromWalletId(wallet.id.toString());
    setToWalletId("");
    setAmount("");
    setTransactionDescription("");
    setTransactionDate(new Date());
    setSelectedTags([]);
    setCustomTags([]);
    setQuickDateSelection("today");
    setExchangeRateInfo(null);
    setManualExchangeRate("");
    setTransferFromWallet(wallet.id);
    setIdempotencyKey(uuidv4());

    // Use setTimeout to ensure state is updated before opening drawer
    setTimeout(() => {
      setTransactionDrawerOpened(true);
    }, 0);
  };

  const handleCloseTransactionDrawer = () => {
    setTransactionDrawerOpened(false);
    setTransferFromWallet(null);
    setTransactionType("transfer");
    setFromWalletId("");
    setToWalletId("");
    setAmount("");
    setTransactionDescription("");
    setSelectedTags([]);
    setCustomTags([]);
    setExchangeRateInfo(null);
    setManualExchangeRate("");
  };

  const handleTransactionSubmit = () => {
    // Format date to YYYY-MM-DD
    const dateObj =
      transactionDate instanceof Date
        ? transactionDate
        : new Date(transactionDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    const transactionData = {
      transactionType: "transfer",
      amount: parseFloat(amount),
      fromWalletId: fromWalletId,
      toWalletId: toWalletId,
      date: formattedDate,
      description: transactionDescription || null,
      suggestedTags: selectedTags,
      customTags: customTags,
    };

    if (manualExchangeRate && parseFloat(manualExchangeRate) > 0) {
      transactionData.manualExchangeRate = parseFloat(manualExchangeRate);
    }

    createTransferMutation.mutate(transactionData);
  };

  const handleEditWallet = (wallet) => {
    setSelectedWallet(wallet);
    setDrawerOpened(true);
  };

  const handleAddWallet = () => {
    setSelectedWallet(null);
    setDrawerOpened(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpened(false);
    setSelectedWallet(null);
  };

  return (
    <AppLayout>
      <Box w="100%">
        {data && data.wallets.length > 0 && (
          <Group justify="flex-end" gap="md">
            {hasArchivedWallets && (
              <ArchivedWalletsManager
                trigger="button"
                buttonVariant="subtle"
                buttonText="View Archived Wallets"
              />
            )}
            <Button
              color="blue.9"
              radius="sm"
              leftSection={<IconWallet size={18} />}
              onMouseDown={createRipple}
              onClick={handleAddWallet}
              w={200}
            >
              Add Wallet
            </Button>
          </Group>
        )}

        {isLoading && (
          <Box
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
            }}
          >
            <Loader size="lg" color="var(--blue-9)" />
          </Box>
        )}

        {error && (
          <Text c="red" mt="md">
            Error: {error.message}
          </Text>
        )}

        {data && data.wallets.length === 0 && (
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px",
              padding: "40px",
            }}
          >
            <Stack gap="lg" align="center">
              <Stack gap="xs" align="center">
                <Text size="xl" fw={600} c="gray.9">
                  No active wallets yet
                </Text>
                <Text size="sm" c="gray.7" ta="center">
                  Create a wallet to start tracking your money and transactions.
                </Text>
              </Stack>
              <Stack gap="sm" align="center">
                <Button
                  color="blue.9"
                  radius="sm"
                  leftSection={<IconWallet size={18} />}
                  onMouseDown={createRipple}
                  onClick={handleAddWallet}
                  w={200}
                >
                  Add Wallet
                </Button>
                {hasArchivedWallets && (
                  <ArchivedWalletsManager
                    trigger="button"
                    buttonVariant="subtle"
                    buttonText="View Archived Wallets"
                  />
                )}
              </Stack>
            </Stack>
          </Box>
        )}

        {data && data.wallets.length > 0 && (
          <Stack gap="md" mt="md">
            {/* Liquidity Summary Box */}
            <LiquiditySummaryBox data={data} />

            {(() => {
              // Calculate how many wallet types have balances > 0
              const walletTypesWithBalance = WALLET_TYPES.filter(
                (walletType) => {
                  const walletsOfType = data.wallets.filter(
                    (w) => w.type === walletType.value,
                  );
                  const typeTotal = walletsOfType.reduce((sum, w) => {
                    const balance =
                      w.balance_in_base_currency !== undefined
                        ? w.balance_in_base_currency
                        : parseFloat(w.current_balance);
                    return sum + balance;
                  }, 0);
                  return typeTotal > 0;
                },
              ).length;

              const showPieChart = walletTypesWithBalance >= 2;

              return (
                <Group gap="md" align="flex-start" wrap="nowrap">
                  {/* Wallet Types Container */}
                  <Box
                    style={{
                      flex: showPieChart ? "0 0 50%" : "1 1 100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {WALLET_TYPES.map((walletType) => {
                      // Filter wallets by this type
                      const walletsOfType = data.wallets.filter(
                        (w) => w.type === walletType.value,
                      );

                      // Skip if no wallets of this type
                      if (walletsOfType.length === 0) return null;

                      // Calculate total for this type in base currency (all wallets converted to base currency)
                      const typeTotal = walletsOfType.reduce((sum, w) => {
                        // Use balance_in_base_currency if available, otherwise use current_balance
                        const balance =
                          w.balance_in_base_currency !== undefined
                            ? w.balance_in_base_currency
                            : parseFloat(w.current_balance);
                        return sum + balance;
                      }, 0);
                      // Always display in base currency since we're summing converted balances
                      const typeCurrency = data.baseCurrency;

                      // Check if this type has any wallets in non-base currency
                      const hasNonBaseCurrency = walletsOfType.some(
                        (w) => w.currency !== data.baseCurrency,
                      );

                      return (
                        <Accordion
                          key={walletType.value}
                          variant="separated"
                          defaultValue={walletType.value}
                          chevron={null}
                          styles={{
                            item: {
                              border: "none",
                              boxShadow: "var(--mantine-shadow-md)",
                            },
                          }}
                        >
                          <Accordion.Item value={walletType.value}>
                            <Accordion.Control
                              style={{
                                pointerEvents: "none",
                                cursor: "default",
                              }}
                            >
                              <Group justify="space-between" pr="md">
                                <Group>
                                  <Text size="sm">{walletType.label}</Text>
                                  <Text size="sm" c="gray.9">
                                    ({walletsOfType.length})
                                  </Text>
                                </Group>
                                {hasNonBaseCurrency ? (
                                  <Tooltip
                                    label={
                                      <>
                                        This total includes wallets in multiple
                                        currencies.
                                        <br />
                                        <br />
                                        All amounts have been converted to your
                                        base currency ({data.baseCurrency})
                                        using the latest exchange rates.
                                      </>
                                    }
                                    multiline
                                    w={280}
                                    withArrow
                                    position="bottom"
                                    styles={{
                                      tooltip: {
                                        fontSize: "12px",
                                        lineHeight: 1.4,
                                      },
                                    }}
                                  >
                                    <Text
                                      fw={600}
                                      size="sm"
                                      style={{
                                        marginRight: "22px",
                                        cursor: "help",
                                        pointerEvents: "auto",
                                      }}
                                    >
                                      <Text
                                        component="span"
                                        style={{ color: "var(--gray-9)" }}
                                      >
                                        ≈{" "}
                                      </Text>
                                      {formatCurrency(typeTotal, typeCurrency)}
                                    </Text>
                                  </Tooltip>
                                ) : (
                                  <Text
                                    fw={600}
                                    size="sm"
                                    style={{ marginRight: "22px" }}
                                  >
                                    {formatCurrency(typeTotal, typeCurrency)}
                                  </Text>
                                )}
                              </Group>
                            </Accordion.Control>
                            <Divider />
                            <Accordion.Panel>
                              <Box
                                style={{
                                  maxHeight:
                                    walletsOfType.length > 5 ? "400px" : "none",
                                  overflowY:
                                    walletsOfType.length > 5
                                      ? "auto"
                                      : "visible",
                                  overflowX: "hidden",
                                }}
                              >
                                <Stack gap={0}>
                                  {walletsOfType.map((wallet, index) => {
                                    // Get first letter of first two words
                                    const words = wallet.name.split(" ");
                                    const initials =
                                      (words[0]?.charAt(0) || "") +
                                      (words[1]?.charAt(0) || "");

                                    return (
                                      <WalletItem
                                        key={wallet.id}
                                        wallet={wallet}
                                        initials={initials}
                                        index={index}
                                        handleEditWallet={handleEditWallet}
                                        handleTransferFromWallet={
                                          handleTransferFromWallet
                                        }
                                        isLast={
                                          index === walletsOfType.length - 1
                                        }
                                      />
                                    );
                                  })}
                                </Stack>
                              </Box>
                            </Accordion.Panel>
                          </Accordion.Item>
                        </Accordion>
                      );
                    })}
                  </Box>

                  {/* Wallet Type Distribution Pie Chart - Only show if 2+ wallet types exist */}
                  {showPieChart && (
                    <WalletTypeDistributionPieChart data={data} />
                  )}
                </Group>
              );
            })()}
          </Stack>
        )}
      </Box>

      <WalletDrawer
        opened={drawerOpened}
        onClose={handleCloseDrawer}
        selectedWallet={selectedWallet}
        onArchiveWallet={handleArchiveWallet}
        baseCurrency={data?.baseCurrency}
      />

      {/* Archive Wallet Confirmation Modal */}
      <ArchiveWalletModal
        opened={archiveConfirmModalOpened}
        onClose={() => {
          setArchiveConfirmModalOpened(false);
          setWalletToArchive(null);
        }}
        wallet={walletToArchive}
        onConfirm={handleConfirmArchive}
        isLoading={archiveWalletMutation.isPending}
      />

      {/* Transaction Drawer for Transfers */}
      <TransactionDrawer
        opened={transactionDrawerOpened}
        onClose={handleCloseTransactionDrawer}
        editMode={false}
        drawerTitle={
          <Group gap="xs">
            <IconArrowsExchange size={20} color="var(--blue-9)" />
            <Text>Transfer Money</Text>
          </Group>
        }
        transactionType={transactionType}
        amount={amount}
        category=""
        walletId=""
        fromWalletId={fromWalletId}
        toWalletId={toWalletId}
        date={transactionDate}
        merchant=""
        counterparty=""
        description={transactionDescription}
        selectedTags={selectedTags}
        customTags={customTags}
        transferFromWallet={transferFromWallet}
        onTransactionTypeChange={setTransactionType}
        onAmountChange={setAmount}
        onAmountBlur={(e) => {
          const rawValue = e?.target?.value
            ?.replace(/,/g, "")
            .replace(/[^\d.]/g, "");

          if (rawValue && fromWalletId) {
            const fromWallet = data?.wallets?.find(
              (w) => w.id.toString() === fromWalletId,
            );
            if (fromWallet && exceedsMaxAmount(rawValue, fromWallet.currency)) {
              const maxString = getMaxAmountString(fromWallet.currency);
              setAmount(maxString);
            }
          }
        }}
        onCategoryChange={() => {}}
        onWalletIdChange={() => {}}
        onFromWalletIdChange={setFromWalletId}
        onToWalletIdChange={setToWalletId}
        onDateChange={setTransactionDate}
        onMerchantChange={() => {}}
        onCounterpartyChange={() => {}}
        onDescriptionChange={setTransactionDescription}
        onSelectedTagsChange={setSelectedTags}
        showTagInput={showTagInput}
        setShowTagInput={setShowTagInput}
        tagSearchValue={tagSearchValue}
        setTagSearchValue={setTagSearchValue}
        maxTagsReached={selectedTags.length + customTags.length >= 5}
        onAddTag={(tagName) => {
          const newTag = {
            id: `custom_${Date.now()}`,
            name: tagName,
            is_custom: true,
          };
          setCustomTags([...customTags, newTag]);
        }}
        onRemoveCustomTag={(tagId) => {
          setCustomTags(customTags.filter((t) => t.id !== tagId));
        }}
        quickDateSelection={quickDateSelection}
        onQuickDateSelect={(value) => {
          setQuickDateSelection(value);
          if (value === "today") {
            setTransactionDate(new Date());
          } else if (value === "yesterday") {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            setTransactionDate(yesterday);
          } else if (value === "2days") {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            setTransactionDate(twoDaysAgo);
          }
        }}
        isFutureDate={transactionDate > new Date()}
        walletsData={data}
        walletsLoading={isLoading}
        referenceData={referenceData}
        referenceLoading={referenceLoading}
        filteredCategories={[]}
        suggestedTags={
          referenceData?.tags?.filter(
            (tag) => !selectedTags.includes(tag.id),
          ) || []
        }
        availableTagsForSearch={
          referenceData?.tags?.filter(
            (tag) =>
              !selectedTags.includes(tag.id) &&
              tag.name.toLowerCase().includes(tagSearchValue.toLowerCase()),
          ) || []
        }
        toWalletOptions={
          data?.wallets
            ?.filter((w) => w.id.toString() !== fromWalletId)
            .map((w) => ({
              value: w.id.toString(),
              label: w.name,
              wallet: w,
            })) || []
        }
        amountOverflowWarning={amountOverflowWarning}
        walletBalanceWarning={null}
        fromWalletBalanceWarning={null}
        maxAllowedAmount={maxAllowedAmount}
        isOverdraftBlocked={false}
        hasChanges={false}
        isSubmitting={createTransferMutation.isPending}
        onSubmit={handleTransactionSubmit}
        amountInputRef={amountInputRef}
        createRipple={createRipple}
        exchangeRateInfo={exchangeRateInfo}
        checkingExchangeRate={checkingExchangeRate}
        manualExchangeRate={manualExchangeRate}
        onManualExchangeRateChange={setManualExchangeRate}
        baseCurrency={data?.baseCurrency || "USD"}
      />
    </AppLayout>
  );
}

export default Wallets;
