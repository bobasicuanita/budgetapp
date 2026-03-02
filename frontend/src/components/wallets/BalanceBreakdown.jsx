import { formatCurrency } from "../../data/currencies";
import { Text, Stack, Group, Box, Divider, Tooltip } from "@mantine/core";
import {
  IconCalculator,
  IconFlag,
  IconAdjustmentsHorizontal,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconScale,
  IconInfoCircle,
} from "@tabler/icons-react";

function BalanceBreakdown({ wallet }) {
  return (
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
        <IconCalculator size={18} color="var(--blue-9)" />
        <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
          Balance Breakdown
        </Text>
      </Group>
      <Divider mb="md" />
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <IconFlag size={16} color="var(--blue-9)" />
          <Text size="sm" style={{ color: "var(--gray-11)" }}>
            Starting Balance
          </Text>
        </Group>
        <Text size="sm" fw={500} style={{ color: "var(--gray-12)" }}>
          {formatCurrency(wallet.starting_balance, wallet.currency)}
        </Text>
      </Group>
      <Box
        my="md"
        style={{
          height: "1px",
          background: "var(--blue-9)",
        }}
      />
      {wallet.breakdown &&
        (() => {
          const hasActivity =
            wallet.breakdown.total_income !== 0 ||
            wallet.breakdown.total_expenses !== 0 ||
            wallet.breakdown.total_transfers_in !== 0 ||
            wallet.breakdown.total_transfers_out !== 0 ||
            wallet.breakdown.total_adjustments !== 0;

          return hasActivity ? (
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconTrendingUp size={16} color="var(--blue-9)" />
                  <Text size="sm" style={{ color: "var(--gray-11)" }}>
                    Income
                  </Text>
                </Group>
                <Text size="sm" fw={500} style={{ color: "var(--green-9)" }}>
                  +
                  {formatCurrency(
                    wallet.breakdown.total_income,
                    wallet.currency,
                  )}
                </Text>
              </Group>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconTrendingDown size={16} color="var(--blue-9)" />
                  <Text size="sm" style={{ color: "var(--gray-11)" }}>
                    Expenses
                  </Text>
                </Group>
                <Text size="sm" fw={500} style={{ color: "var(--red-9)" }}>
                  -
                  {formatCurrency(
                    wallet.breakdown.total_expenses,
                    wallet.currency,
                  )}
                </Text>
              </Group>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconArrowDownLeft size={16} color="var(--blue-9)" />
                  <Text size="sm" style={{ color: "var(--gray-11)" }}>
                    Transfers In
                  </Text>
                </Group>
                <Text size="sm" fw={500} style={{ color: "var(--green-9)" }}>
                  +
                  {formatCurrency(
                    wallet.breakdown.total_transfers_in,
                    wallet.currency,
                  )}
                </Text>
              </Group>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconArrowUpRight size={16} color="var(--blue-9)" />
                  <Text size="sm" style={{ color: "var(--gray-11)" }}>
                    Transfers Out
                  </Text>
                </Group>
                <Text size="sm" fw={500} style={{ color: "var(--red-9)" }}>
                  -
                  {formatCurrency(
                    wallet.breakdown.total_transfers_out,
                    wallet.currency,
                  )}
                </Text>
              </Group>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconAdjustmentsHorizontal size={16} color="var(--blue-9)" />
                  <Text size="sm" style={{ color: "var(--gray-11)" }}>
                    Balance Adjustments
                  </Text>
                  <Tooltip
                    label={
                      <div>
                        <div>
                          Manual corrections made to align the wallet balance
                          with reality.
                        </div>
                        <div>
                          Adjustments don't represent income or spending.
                        </div>
                      </div>
                    }
                    multiline
                    w={280}
                    withArrow
                  >
                    <IconInfoCircle
                      size={14}
                      color="var(--blue-9)"
                      style={{ cursor: "help" }}
                    />
                  </Tooltip>
                </Group>
                <Text
                  size="sm"
                  fw={500}
                  style={{
                    color:
                      wallet.breakdown.total_adjustments >= 0
                        ? "var(--green-9)"
                        : "var(--red-9)",
                  }}
                >
                  {wallet.breakdown.total_adjustments >= 0 ? "+" : ""}
                  {formatCurrency(
                    wallet.breakdown.total_adjustments,
                    wallet.currency,
                  )}
                </Text>
              </Group>
            </Stack>
          ) : (
            <Text size="md" c="gray.9" ta="center" py="md">
              No activity yet. Balance equals starting balance.
            </Text>
          );
        })()}
      <Box
        my="md"
        style={{
          height: "1px",
          background: "var(--blue-9)",
        }}
      />
      <Group justify="space-between" align="center" mt="md">
        <Group gap="xs">
          <IconScale size={16} color="var(--blue-9)" />
          <Text size="sm" fw={600} style={{ color: "var(--gray-12)" }}>
            Current Balance
          </Text>
        </Group>
        <Text size="md" fw={700} style={{ color: "var(--gray-12)" }}>
          {formatCurrency(wallet.current_balance, wallet.currency)}
        </Text>
      </Group>
    </Box>
  );
}

export default BalanceBreakdown;
