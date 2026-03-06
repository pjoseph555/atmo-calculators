/**
 * Input validation for calculator fields.
 */

import type { CalcInput, NumericInput } from "@/types/calculator";

export interface ValidationError {
  fieldId: string;
  message: string;
}

/**
 * Validate a single numeric input value against its min/max constraints.
 * Returns an error message or null if valid.
 */
export function validateNumericInput(
  field: NumericInput,
  value: number | undefined
): string | null {
  if (value === undefined || isNaN(value)) return null; // empty is allowed

  if (field.min !== undefined && value < field.min) {
    return `Must be at least ${field.min}`;
  }
  if (field.max !== undefined && value > field.max) {
    return `Must be at most ${field.max}`;
  }
  return null;
}

/**
 * Validate all inputs of a calculator.
 * Returns a map of fieldId → error message for any fields with errors.
 */
export function validateInputs(
  inputs: CalcInput[],
  values: Record<string, number | undefined>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const input of inputs) {
    if (input.type === "numeric") {
      const err = validateNumericInput(input, values[input.id]);
      if (err) errors[input.id] = err;
    }
  }

  return errors;
}
