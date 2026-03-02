import {
  Text,
  Stack,
  Group,
  Button,
  Modal,
  Box,
  Alert,
  TextInput,
  NumberInput,
  Badge,
} from "@mantine/core";
import { formatCurrency, getCurrencySymbol } from "../../data/currencies";
import {
  getCurrencyDecimals,
  getMaxAmountDisplay,
  exceedsMaxAmount,
  getMaxAmountString,
} from "../../utils/amountValidation";
import { IconAdjustments, IconAlertTriangle } from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import PropTypes from "prop-types";

function AdjustBalanceModal({
  adjustModalOpened,
  handleCloseAdjustModal,
  adjustBalanceMutation,
  handleConfirmAdjustment,
  newBalance,
  setNewBalance,
  wallet,
  reason,
  setReason,
  adjustmentDate,
  setAdjustmentDate,
}) {
  return (
    <Modal
      opened={adjustModalOpened}
      onClose={handleCloseAdjustModal}
      title={
        <Group gap="xs">
          <IconAdjustments size={20} color="var(--blue-9)" />
          <Text>Correct wallet balance</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack
        gap="md"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (!adjustBalanceMutation.isPending) {
              handleConfirmAdjustment();
            }
          }
        }}
      >
        {/* Subtitle */}
        <Text size="sm" style={{ color: "var(--gray-12)" }}>
          Use this if the wallet balance is incorrect. This will not affect
          income or expenses.
        </Text>

        {/* Current Balance (Read-only) */}
        <Box>
          <Text size="sm" fw={500} mb={4} style={{ color: "var(--gray-12)" }}>
            Current Balance
          </Text>
          <TextInput
            value={formatCurrency(wallet.current_balance, wallet.currency)}
            readOnly
            styles={{
              input: {
                backgroundColor: "var(--gray-1)",
                color: "var(--gray-11)",
                cursor: "not-allowed",
              },
            }}
          />
        </Box>

        {/* New Balance */}
        <NumberInput
          label="New Balance"
          placeholder="0.00"
          value={newBalance}
          onChange={(value) => setNewBalance(value)}
          onBlur={(e) => {
            // Get the raw string value from the input to avoid floating point precision loss
            const rawValue = e.target.value
              ?.replace(/,/g, "")
              .replace(/[^\d.]/g, "");

            // Auto-correct to max if exceeded (check raw string value)
            if (rawValue && exceedsMaxAmount(rawValue, wallet.currency)) {
              setNewBalance(getMaxAmountString(wallet.currency));
            }
          }}
          thousandSeparator=","
          decimalScale={getCurrencyDecimals(wallet.currency)}
          fixedDecimalScale={getCurrencyDecimals(wallet.currency) > 0}
          prefix={getCurrencySymbol(wallet.currency) + " "}
          required
          min={0}
          error={
            newBalance && exceedsMaxAmount(newBalance, wallet.currency)
              ? `Maximum allowed: ${getMaxAmountDisplay(wallet.currency)}`
              : null
          }
        />

        {/* Date */}
        <DateInput
          label="Date"
          value={adjustmentDate}
          onChange={setAdjustmentDate}
          maxDate={new Date()}
          minDate={new Date(wallet.created_at)}
          required
          valueFormat="DD/MM/YYYY"
        />

        {/* Reason (Optional) */}
        <TextInput
          label={
            <Group gap={8}>
              <Text size="sm" fw={500}>
                Reason
              </Text>
              <Badge size="xs" variant="light" color="blue.9" c="blue.9">
                Recommended
              </Badge>
            </Group>
          }
          placeholder="e.g. Forgot to record cash transactions"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={80}
          className="text-input"
        />

        {/* Warning Banner */}
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
        >
          This creates a system adjustment transaction. It will update the
          wallet balance but will not count as income or expense.
        </Alert>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            color="blue"
            style={{ color: "var(--blue-9)" }}
            onClick={handleCloseAdjustModal}
            disabled={adjustBalanceMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            color="blue"
            style={{ backgroundColor: "var(--blue-9)" }}
            loading={adjustBalanceMutation.isPending}
            onClick={handleConfirmAdjustment}
          >
            Confirm Adjustment
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

AdjustBalanceModal.propTypes = {
  adjustModalOpened: PropTypes.bool.isRequired,
  handleCloseAdjustModal: PropTypes.func.isRequired,
  adjustBalanceMutation: PropTypes.func.isRequired,
  handleConfirmAdjustment: PropTypes.func.isRequired,
  newBalance: PropTypes.number.isRequired,
  setNewBalance: PropTypes.func.isRequired,
  wallet: PropTypes.object.isRequired,
  reason: PropTypes.string.isRequired,
  setReason: PropTypes.func.isRequired,
  adjustmentDate: PropTypes.Date,
  setAdjustmentDate: PropTypes.func.isRequired,
};

export default AdjustBalanceModal;
