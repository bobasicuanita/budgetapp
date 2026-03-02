import { formatCurrency } from "../../data/currencies";
import { Text, Stack, Group, Box, Tooltip, Divider } from "@mantine/core";
import { IconCoins, IconShoppingCart, IconPigMoney } from "@tabler/icons-react";
import PropTypes from "prop-types";

function LiquiditySummaryBox({ data }) {
  return (
    <Box
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid var(--gray-4)",
        boxShadow: "var(--mantine-shadow-md)",
      }}
    >
      <Group align="flex-start">
        {/* Liquidity */}
        <Stack
          gap="xs"
          style={{ flex: "1 1 0", minWidth: 0 }}
          align="flex-start"
        >
          <Group gap="xs">
            <IconCoins size={20} color="var(--blue-9)" />
            <Text size="xs" c="gray.11" fw={500}>
              LIQUIDITY
            </Text>
          </Group>
          {data.wallets.some((w) => w.currency !== data.baseCurrency) ? (
            <Tooltip
              label={
                <>
                  This total includes assets in multiple currencies.
                  <br />
                  <br />
                  All amounts have been converted to your base currency (
                  {data.baseCurrency}) using the latest exchange rates.
                </>
              }
              multiline
              w={280}
              withArrow
              position="bottom"
              styles={{
                tooltip: { fontSize: "12px", lineHeight: 1.4 },
              }}
            >
              <Text
                component="span"
                fw={600}
                style={{
                  cursor: "help",
                  display: "inline-block",
                  fontSize: (() => {
                    const formattedAmount = formatCurrency(
                      data.totalLiquidity,
                      data.baseCurrency,
                    );
                    if (formattedAmount.length > 20) return "14px";
                    if (formattedAmount.length > 15) return "16px";
                    if (formattedAmount.length > 12) return "18px";
                    return "20px";
                  })(),
                }}
              >
                <Text component="span" style={{ color: "var(--gray-9)" }}>
                  ≈{" "}
                </Text>
                {formatCurrency(data.totalLiquidity, data.baseCurrency)}
              </Text>
            </Tooltip>
          ) : (
            <Text
              fw={600}
              style={{
                fontSize: (() => {
                  const formattedAmount = formatCurrency(
                    data.totalLiquidity,
                    data.baseCurrency,
                  );
                  if (formattedAmount.length > 20) return "14px";
                  if (formattedAmount.length > 15) return "16px";
                  if (formattedAmount.length > 12) return "18px";
                  return "20px";
                })(),
              }}
            >
              {formatCurrency(data.totalLiquidity, data.baseCurrency)}
            </Text>
          )}
        </Stack>

        <Divider orientation="vertical" />

        {/* Available for Spending */}
        <Stack
          gap="xs"
          style={{ flex: "1 1 0", minWidth: 0 }}
          align="flex-start"
        >
          <Group gap="xs">
            <IconShoppingCart size={20} color="var(--blue-9)" />
            <Text size="xs" c="gray.11" fw={500}>
              AVAILABLE FOR SPENDING
            </Text>
          </Group>
          {data.wallets.some(
            (w) => w.currency !== data.baseCurrency && w.include_in_balance,
          ) ? (
            <Tooltip
              label={
                <>
                  This total includes wallets in multiple currencies.
                  <br />
                  <br />
                  All amounts have been converted to your base currency (
                  {data.baseCurrency}) using the latest exchange rates.
                </>
              }
              multiline
              w={280}
              withArrow
              position="bottom"
              styles={{
                tooltip: { fontSize: "12px", lineHeight: 1.4 },
              }}
            >
              <Text
                fw={600}
                style={{
                  cursor: "help",
                  fontSize: (() => {
                    const formattedAmount = formatCurrency(
                      data.availableForSpending,
                      data.baseCurrency,
                    );
                    if (formattedAmount.length > 20) return "14px";
                    if (formattedAmount.length > 15) return "16px";
                    if (formattedAmount.length > 12) return "18px";
                    return "20px";
                  })(),
                }}
              >
                <Text component="span" style={{ color: "var(--gray-9)" }}>
                  ≈{" "}
                </Text>
                {formatCurrency(data.availableForSpending, data.baseCurrency)}
              </Text>
            </Tooltip>
          ) : (
            <Text
              fw={600}
              style={{
                fontSize: (() => {
                  const formattedAmount = formatCurrency(
                    data.availableForSpending,
                    data.baseCurrency,
                  );
                  if (formattedAmount.length > 20) return "14px";
                  if (formattedAmount.length > 15) return "16px";
                  if (formattedAmount.length > 12) return "18px";
                  return "20px";
                })(),
              }}
            >
              {formatCurrency(data.availableForSpending, data.baseCurrency)}
            </Text>
          )}
        </Stack>

        <Divider orientation="vertical" />

        {/* Excluded (Savings & Locked) */}
        <Stack
          gap="xs"
          style={{ flex: "1 1 0", minWidth: 0 }}
          align="flex-start"
        >
          <Group gap="xs">
            <IconPigMoney size={20} color="var(--blue-9)" />
            <Text size="xs" c="gray.11" fw={500}>
              EXCLUDED (SAVINGS & LOCKED)
            </Text>
          </Group>
          {data.wallets.some(
            (w) => w.currency !== data.baseCurrency && !w.include_in_balance,
          ) ? (
            <Tooltip
              label={
                <>
                  This total includes wallets in multiple currencies.
                  <br />
                  <br />
                  All amounts have been converted to your base currency (
                  {data.baseCurrency}) using the latest exchange rates.
                </>
              }
              multiline
              w={280}
              withArrow
              position="bottom"
              styles={{
                tooltip: { fontSize: "12px", lineHeight: 1.4 },
              }}
            >
              <Text fw={600} size="xl" style={{ cursor: "help" }}>
                <Text component="span" style={{ color: "var(--gray-9)" }}>
                  ≈{" "}
                </Text>
                {formatCurrency(data.excludedBalance, data.baseCurrency)}
              </Text>
            </Tooltip>
          ) : (
            <Text fw={600} size="xl">
              {formatCurrency(data.excludedBalance, data.baseCurrency)}
            </Text>
          )}
        </Stack>
      </Group>
    </Box>
  );
}

LiquiditySummaryBox.propTypes = {
  data: PropTypes.object.isRequired,
};

export default LiquiditySummaryBox;
