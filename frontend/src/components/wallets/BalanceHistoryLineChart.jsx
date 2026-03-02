import { Text, Group, Box, SegmentedControl } from "@mantine/core";
import { formatCurrency, getCurrencySymbol } from "../../data/currencies";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { IconChartLine } from "@tabler/icons-react";
import PropTypes from "prop-types";

// Helper function to abbreviate large currency values for Y-axis
const formatAbbreviatedCurrency = (value, currency) => {
  const symbol = getCurrencySymbol(currency);
  const absValue = Math.abs(value);

  if (absValue >= 1000000000) {
    return `${symbol}${(value / 1000000000).toFixed(1)}B`;
  } else if (absValue >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `${symbol}${(value / 1000).toFixed(1)}K`;
  } else {
    return `${symbol}${value.toFixed(0)}`;
  }
};

function BalanceHistoryLineChart({ chartViewMode, setChartViewMode, wallet }) {
  return (
    <Box
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        width: "100%",
        boxShadow: "var(--mantine-shadow-md)",
        overflow: "hidden",
        padding: "16px",
      }}
    >
      <style>
        {`
                .recharts-wrapper, 
                .recharts-wrapper *,
                .recharts-surface,
                .recharts-wrapper svg,
                .recharts-wrapper path,
                .recharts-wrapper g,
                .recharts-wrapper line,
                .recharts-wrapper text {
                  outline: none !important;
                }
                .recharts-wrapper *:focus,
                .recharts-wrapper svg:focus,
                .recharts-surface:focus {
                  outline: none !important;
                }
              `}
      </style>
      <Group justify="space-between" align="center" mb="md">
        <Group gap={8}>
          <IconChartLine size={18} color="var(--blue-9)" />
          <Text size="sm" fw={500}>
            <Text component="span" c="gray.11" fw={500}>
              Balance History{" "}
            </Text>
            <Text component="span" c="gray.9" size="xs">
              (Last 30 Days)
            </Text>
          </Text>
        </Group>
        <SegmentedControl
          value={chartViewMode}
          onChange={setChartViewMode}
          data={[
            { label: "Value", value: "value" },
            { label: "Performance", value: "performance" },
          ]}
          size="xs"
          radius="sm"
        />
      </Group>
      <Box style={{ outline: "none" }}>
        <ResponsiveContainer
          width="100%"
          height={400}
          key={`chart-${wallet.id}-${chartViewMode}`}
        >
          <AreaChart
            data={(() => {
              if (chartViewMode === "value") {
                return wallet.balance_history.map((item) => ({
                  date: item.date,
                  dateFormatted: new Date(item.date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  ),
                  balance: item.balance,
                }));
              } else {
                // Performance mode: calculate percentage change from baseline
                const baseline =
                  wallet.balance_history.find((item) => item.balance !== null)
                    ?.balance || 0;
                return wallet.balance_history.map((item) => {
                  if (item.balance === null) {
                    return {
                      date: item.date,
                      dateFormatted: new Date(item.date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      ),
                      performance: null,
                    };
                  }
                  const performancePercent =
                    baseline !== 0
                      ? ((item.balance - baseline) / baseline) * 100
                      : 0;
                  return {
                    date: item.date,
                    dateFormatted: new Date(item.date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      },
                    ),
                    performance: performancePercent,
                  };
                });
              }
            })()}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={`var(--${wallet.color}-9)`}
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor={`var(--${wallet.color}-9)`}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient
                id="positivePerformanceGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--green-9)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor="var(--green-9)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient
                id="negativePerformanceGradient"
                x1="0"
                y1="1"
                x2="0"
                y2="0"
              >
                <stop offset="0%" stopColor="var(--red-9)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--red-9)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray=""
              stroke="var(--gray-3)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 11, fill: "var(--gray-12)" }}
              tickLine={{ stroke: "var(--gray-12)" }}
              axisLine={{ stroke: "var(--gray-12)" }}
              height={50}
              interval={1}
            />
            {chartViewMode === "value" ? (
              <YAxis
                tick={{ fontSize: 12, fill: "var(--gray-12)" }}
                tickLine={{ stroke: "var(--gray-12)" }}
                axisLine={{ stroke: "var(--gray-12)" }}
                tickFormatter={(value) =>
                  formatAbbreviatedCurrency(value, wallet.currency)
                }
                tickCount={5}
              />
            ) : (
              <YAxis
                tick={{ fontSize: 12, fill: "var(--gray-11)" }}
                tickLine={{ stroke: "var(--gray-11)" }}
                axisLine={{ stroke: "var(--gray-11)" }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                tickCount={5}
                domain={(() => {
                  const baseline =
                    wallet.balance_history.find((item) => item.balance !== null)
                      ?.balance || 0;
                  const performanceValues = wallet.balance_history
                    .filter((item) => item.balance !== null)
                    .map((item) =>
                      baseline !== 0
                        ? ((item.balance - baseline) / baseline) * 100
                        : 0,
                    );

                  const minPerf = Math.min(...performanceValues, 0);
                  const maxPerf = Math.max(...performanceValues, 0);

                  // Calculate the larger absolute value to ensure 0% is centered
                  const maxAbsolute = Math.max(
                    Math.abs(minPerf),
                    Math.abs(maxPerf),
                  );

                  // Ensure minimum range of ±1%
                  const paddedRange = Math.max(maxAbsolute, 1);

                  return [-paddedRange, paddedRange];
                })()}
              />
            )}
            {chartViewMode === "value" ? (
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid var(--gray-3)",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  formatCurrency(value, wallet.currency),
                  "Balance",
                ]}
                labelFormatter={(label) => label}
              />
            ) : (
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid var(--gray-3)",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
                  "Performance",
                ]}
                labelFormatter={(label) => label}
              />
            )}
            {chartViewMode === "performance" && (
              <ReferenceLine
                y={0}
                stroke="var(--gray-7)"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            )}
            {chartViewMode === "value" ? (
              <Area
                type="linear"
                dataKey="balance"
                stroke={`var(--${wallet.color}-9)`}
                strokeWidth={2}
                fill="url(#areaGradient)"
                dot={false}
                activeDot={{ r: 4, fill: `var(--${wallet.color}-9)` }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            ) : (
              <Area
                type="linear"
                dataKey="performance"
                stroke={(() => {
                  const lastValidPerformance = wallet.balance_history
                    .filter((item) => item.balance !== null)
                    .map((item) => {
                      const baseline =
                        wallet.balance_history.find((i) => i.balance !== null)
                          ?.balance || 0;
                      return baseline !== 0
                        ? ((item.balance - baseline) / baseline) * 100
                        : 0;
                    })
                    .pop();
                  return lastValidPerformance >= 0
                    ? "var(--green-9)"
                    : "var(--red-9)";
                })()}
                strokeWidth={2}
                fill={(() => {
                  const lastValidPerformance = wallet.balance_history
                    .filter((item) => item.balance !== null)
                    .map((item) => {
                      const baseline =
                        wallet.balance_history.find((i) => i.balance !== null)
                          ?.balance || 0;
                      return baseline !== 0
                        ? ((item.balance - baseline) / baseline) * 100
                        : 0;
                    })
                    .pop();
                  return lastValidPerformance >= 0
                    ? "url(#positivePerformanceGradient)"
                    : "url(#negativePerformanceGradient)";
                })()}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: (() => {
                    const lastValidPerformance = wallet.balance_history
                      .filter((item) => item.balance !== null)
                      .map((item) => {
                        const baseline =
                          wallet.balance_history.find((i) => i.balance !== null)
                            ?.balance || 0;
                        return baseline !== 0
                          ? ((item.balance - baseline) / baseline) * 100
                          : 0;
                      })
                      .pop();
                    return lastValidPerformance >= 0
                      ? "var(--green-9)"
                      : "var(--red-9)";
                  })(),
                }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

BalanceHistoryLineChart.propTypes = {
  wallet: PropTypes.object.isRequired,
  chartViewMode: PropTypes.string.isRequired,
  setChartViewMode: PropTypes.func.isRequired,
};

export default BalanceHistoryLineChart;
