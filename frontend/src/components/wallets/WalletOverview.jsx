import { formatCurrency } from "../../data/currencies";
import {
  Text,
  Stack,
  Group,
  Box,
  Badge,
  Avatar,
  Divider,
  Tooltip,
} from "@mantine/core";
import { IconWallet } from "@tabler/icons-react";
import PropTypes from "prop-types";

function WalletOverview({ wallet, walletsData }) {
  return (
    <>
      {/* Wallet Overview */}
      <Box
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid var(--gray-3)",
          padding: "16px",
          boxShadow: "var(--mantine-shadow-md)",
          flex: 1,
        }}
      >
        <Group gap="xs" mb="xs">
          <IconWallet size={18} color="var(--blue-9)" />
          <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
            Wallet Overview
          </Text>
        </Group>
        <Divider mb="md" />
        <Group gap="md" align="flex-start">
          <Stack gap="md" align="center">
            {wallet.icon &&
            (wallet.icon.startsWith("data:image") ||
              wallet.icon.startsWith("http")) ? (
              <Box
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Box>
            ) : (
              <Avatar
                radius="md"
                size={56}
                color="white"
                style={{
                  backgroundColor: `var(--${wallet.color}-9)`,
                }}
              >
                <Text size="xl" fw={600}>
                  {(() => {
                    const words = wallet.name.split(" ");
                    return (
                      (words[0]?.charAt(0) || "") + (words[1]?.charAt(0) || "")
                    );
                  })()}
                </Text>
              </Avatar>
            )}
          </Stack>
          <Stack gap={1} style={{ flex: 1 }}>
            <Text size="lg" fw={600} style={{ color: "var(--gray-12)" }}>
              {wallet.name}
            </Text>
            <Group gap={4}>
              <Tooltip
                label="Determines how this wallet behaves, such as whether it can go negative or be used for transfers."
                multiline
                w={280}
                withArrow
              >
                <Text
                  size="xs"
                  style={{ color: "var(--gray-9)", cursor: "help" }}
                >
                  {wallet.type === "bank" && "Bank Account"}
                  {wallet.type === "cash" && "Cash Wallet"}
                  {wallet.type === "digital_wallet" && "Digital Wallet"}
                </Text>
              </Tooltip>
              <Text size="xs" style={{ color: "var(--gray-9)" }}>
                •
              </Text>
              <Tooltip
                label="All transactions in this wallet use this currency."
                withArrow
              >
                <Text
                  size="xs"
                  style={{ color: "var(--gray-9)", cursor: "help" }}
                >
                  {wallet.currency}
                </Text>
              </Tooltip>
            </Group>
          </Stack>
        </Group>
        <Stack gap={1} mt="xl">
          <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
            Balance
          </Text>
          <Stack gap={1}>
            <Text size="xl" fw={700} style={{ color: "var(--gray-12)" }}>
              {formatCurrency(wallet.current_balance, wallet.currency)}
            </Text>
            {wallet.currency !== walletsData?.baseCurrency &&
              walletsData?.baseCurrency &&
              wallet.balance_in_base_currency !== undefined && (
                <Box style={{ display: "inline-block" }}>
                  <Tooltip
                    label="Shown in your base currency using the most recent available exchange rate."
                    multiline
                    w={280}
                    withArrow
                  >
                    <Text
                      size="xs"
                      style={{
                        color: "var(--gray-9)",
                        cursor: "help",
                        display: "inline",
                      }}
                    >
                      ≈{" "}
                      {formatCurrency(
                        wallet.balance_in_base_currency,
                        walletsData.baseCurrency,
                      )}{" "}
                      {walletsData.baseCurrency}
                    </Text>
                  </Tooltip>
                </Box>
              )}
          </Stack>
        </Stack>
        <Group gap="xs" mt="sm">
          <Tooltip
            label={
              wallet.include_in_balance
                ? "This wallet is counted in your available balance"
                : "This wallet is not counted in your available balance"
            }
            withArrow
          >
            <Badge
              size="sm"
              variant="light"
              styles={{
                root: {
                  color: wallet.include_in_balance
                    ? "var(--green-9)"
                    : "var(--gray-9)",
                },
              }}
            >
              {wallet.include_in_balance ? "Included" : "Excluded"}
            </Badge>
          </Tooltip>
          {wallet.is_archived && (
            <Tooltip
              label="This wallet is hidden from totals and new transactions but keeps its history."
              multiline
              w={280}
              withArrow
            >
              <Badge
                size="sm"
                color="orange"
                variant="light"
                styles={{
                  root: {
                    color: "var(--orange-9)",
                    cursor: "help",
                  },
                }}
              >
                Archived
              </Badge>
            </Tooltip>
          )}
        </Group>

        {/* Wallet Info */}
        <Divider my="md" />
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text size="sm" style={{ color: "var(--gray-11)" }}>
              Created on
            </Text>
            <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
              {new Date(wallet.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </Group>
          {wallet.last_activity_date && (
            <Group justify="space-between" align="center">
              <Text size="sm" style={{ color: "var(--gray-11)" }}>
                Last activity
              </Text>
              <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
                {new Date(wallet.last_activity_date).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </Text>
            </Group>
          )}
          <Group justify="space-between" align="center">
            <Text size="sm" style={{ color: "var(--gray-11)" }}>
              Transactions
            </Text>
            <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
              {wallet.transaction_count || 0}
            </Text>
          </Group>
          {wallet.is_archived && (
            <Group justify="space-between" align="center">
              <Text size="sm" style={{ color: "var(--gray-11)" }}>
                Archived on
              </Text>
              <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
                {new Date(wallet.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </Group>
          )}
        </Stack>
      </Box>
    </>
  );
}

WalletOverview.propTypes = {
  wallet: PropTypes.object.isRequired,
  walletsData: PropTypes.object.isRequired,
};

export default WalletOverview;
