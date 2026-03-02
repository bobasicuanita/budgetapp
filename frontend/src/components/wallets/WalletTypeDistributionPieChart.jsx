import { Text, Box } from "@mantine/core";
import { formatCurrency } from "../../data/currencies";
import { WALLET_TYPES } from "../../data/walletTypes";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Sector,
  Legend,
} from "recharts";
import PropTypes from "prop-types";

// Wallet type colors for pie chart
const WALLET_TYPE_COLORS = {
  cash: "#10b981", // Green
  bank: "#3b82f6", // Blue
  digital_wallet: "#8b5cf6", // Purple
};

const RADIAN = Math.PI / 180;

// Active shape renderer for pie chart (donut style with hover)
const createRenderActiveShape =
  (baseCurrency, formatCurrency) =>
  ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  }) => {
    const sin = Math.sin(-RADIAN * (midAngle ?? 1));
    const cos = Math.cos(-RADIAN * (midAngle ?? 1));
    const sx = (cx ?? 0) + ((outerRadius ?? 0) + 10) * cos;
    const sy = (cy ?? 0) + ((outerRadius ?? 0) + 10) * sin;
    const mx = (cx ?? 0) + ((outerRadius ?? 0) + 30) * cos;
    const my = (cy ?? 0) + ((outerRadius ?? 0) + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? "start" : "end";

    // Format the value text with proper handling for large numbers
    const formattedValue = formatCurrency(value, baseCurrency);

    // Dynamically adjust font size based on text length
    let amountFontSize = 14;
    if (formattedValue.length > 14) {
      amountFontSize = 8;
    } else if (formattedValue.length > 12) {
      amountFontSize = 11;
    } else if (formattedValue.length > 10) {
      amountFontSize = 12;
    }

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={(outerRadius ?? 0) + 6}
          outerRadius={(outerRadius ?? 0) + 10}
          fill={fill}
        />
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={fill}
          fill="none"
        />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          textAnchor={textAnchor}
          fill="#333"
          fontSize={amountFontSize}
        >
          {formattedValue}
        </text>
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          dy={18}
          textAnchor={textAnchor}
          fill="#999"
          fontSize="12"
        >
          {`${((percent ?? 1) * 100).toFixed(2)}%`}
        </text>
      </g>
    );
  };

function WalletTypeDistributionPieChart({ data }) {
  return (
    <Box
      className="pie-chart-container-2"
      style={{
        width: "50%",
        boxSizing: "border-box",
        background: "white",
        borderRadius: "8px",
        padding: "20px 0",
        border: "1px solid var(--gray-4)",
        boxShadow: "var(--mantine-shadow-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      <style>
        {`
        .pie-chart-container-2 * {
            outline: none !important;
        }
        .pie-chart-container-2 *:focus {
            outline: none !important;
        }
        .pie-chart-container-2 *:active {
            outline: none !important;
        }
        .pie-chart-container-2 .recharts-surface {
            outline: none !important;
        }
        .pie-chart-container-2 svg {
            outline: none !important;
        }
        .pie-chart-container-2 path {
            outline: none !important;
        }
        .pie-chart-container-2 g {
            outline: none !important;
        }
        .pie-chart-container-2 text {
            outline: none !important;
        }
    `}
      </style>
      <Text size="sm" fw={600} mb="md" c="gray.9">
        WALLET TYPE DISTRIBUTION
      </Text>
      <PieChart
        width={500}
        height={420}
        tabIndex={-1}
        margin={{
          top: 60,
          right: 120,
          bottom: 80,
          left: 120,
        }}
      >
        <Pie
          activeShape={createRenderActiveShape(
            data.baseCurrency,
            formatCurrency,
          )}
          data={(() => {
            // Build pie chart data from wallet types
            return WALLET_TYPES.map((walletType) => {
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

              return {
                name: walletType.label,
                value: typeTotal,
                type: walletType.value,
              };
            }).filter((item) => item.value > 0);
          })()}
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="80%"
          dataKey="value"
          isAnimationActive={true}
        >
          {(() => {
            const pieData = WALLET_TYPES.map((walletType) => {
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

              return {
                name: walletType.label,
                value: typeTotal,
                type: walletType.value,
              };
            }).filter((item) => item.value > 0);

            return pieData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={WALLET_TYPE_COLORS[entry.type]}
              />
            ));
          })()}
        </Pie>
        <RechartsTooltip content={() => null} />
        <Legend
          verticalAlign="bottom"
          height={50}
          layout="horizontal"
          align="center"
          iconType="circle"
          wrapperStyle={{
            paddingTop: "50px",
          }}
          content={(props) => {
            const { payload } = props;
            return (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "nowrap",
                }}
              >
                {payload.map((entry, index) => (
                  <div
                    key={`legend-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: entry.color,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          }}
        />
      </PieChart>
    </Box>
  );
}

WalletTypeDistributionPieChart.propTypes = {
  data: PropTypes.object.isRequired,
};

export default WalletTypeDistributionPieChart;
