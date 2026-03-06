/**
 * Validates imported calculator JSON against the schema.
 * Returns a list of error messages (empty = valid).
 */

import type { CalculatorDefinition } from "@/types/calculator";

const VALID_STATUSES = ["draft", "active", "deprecated"];
const VALID_COMPLEXITIES = ["simple", "moderate", "complex"];
const VALID_INPUT_TYPES = ["numeric", "dropdown", "date"];
const VALID_OUTPUT_TYPES = ["numeric", "date"];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCalculator(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, errors: ["Must be a JSON object"] };
  }

  const obj = raw as Record<string, unknown>;

  // Required string fields
  for (const field of ["id", "name"] as const) {
    if (!obj[field] || typeof obj[field] !== "string") {
      errors.push(`"${field}" is required and must be a string`);
    }
  }

  // Status
  if (!VALID_STATUSES.includes(obj.status as string)) {
    errors.push(`"status" must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  // Complexity
  if (!VALID_COMPLEXITIES.includes(obj.complexity as string)) {
    errors.push(`"complexity" must be one of: ${VALID_COMPLEXITIES.join(", ")}`);
  }

  // Inputs
  if (!Array.isArray(obj.inputs)) {
    errors.push('"inputs" must be an array');
  } else {
    obj.inputs.forEach((inp: unknown, i: number) => {
      const prefix = `inputs[${i}]`;
      if (!inp || typeof inp !== "object") {
        errors.push(`${prefix} must be an object`);
        return;
      }
      const field = inp as Record<string, unknown>;
      if (!VALID_INPUT_TYPES.includes(field.type as string)) {
        errors.push(`${prefix}.type must be one of: ${VALID_INPUT_TYPES.join(", ")}`);
      }
      if (!field.id || typeof field.id !== "string") {
        errors.push(`${prefix}.id is required`);
      }
      if (!field.label || typeof field.label !== "string") {
        errors.push(`${prefix}.label is required`);
      }
      if (field.type === "dropdown") {
        if (!Array.isArray(field.options) || field.options.length === 0) {
          errors.push(`${prefix}.options must be a non-empty array for dropdown inputs`);
        }
      }
    });
  }

  // Outputs
  if (!Array.isArray(obj.outputs)) {
    errors.push('"outputs" must be an array');
  } else {
    obj.outputs.forEach((out: unknown, i: number) => {
      const prefix = `outputs[${i}]`;
      if (!out || typeof out !== "object") {
        errors.push(`${prefix} must be an object`);
        return;
      }
      const field = out as Record<string, unknown>;
      if (!VALID_OUTPUT_TYPES.includes(field.type as string)) {
        errors.push(`${prefix}.type must be one of: ${VALID_OUTPUT_TYPES.join(", ")}`);
      }
      if (!field.id || typeof field.id !== "string") {
        errors.push(`${prefix}.id is required`);
      }
      if (!field.label || typeof field.label !== "string") {
        errors.push(`${prefix}.label is required`);
      }
      if (field.type === "numeric" && typeof field.formula !== "string") {
        errors.push(`${prefix}.formula is required for numeric outputs`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse and validate an imported JSON payload.
 * Accepts a single CalculatorDefinition or an array of them.
 * Returns validated calculators and per-item errors.
 */
export function parseImport(raw: unknown): {
  calculators: CalculatorDefinition[];
  errors: { index: number; id?: string; errors: string[] }[];
} {
  const items: unknown[] = Array.isArray(raw) ? raw : [raw];
  const calculators: CalculatorDefinition[] = [];
  const errors: { index: number; id?: string; errors: string[] }[] = [];

  items.forEach((item, index) => {
    const result = validateCalculator(item);
    if (result.valid) {
      const calc = item as CalculatorDefinition;
      // Fill in defaults for optional fields
      const now = new Date().toISOString();
      calculators.push({
        ...calc,
        version: typeof calc.version === "number" ? calc.version : 1,
        createdAt: calc.createdAt ?? now,
        updatedAt: now,
      });
    } else {
      const id = (item as Record<string, unknown>)?.id as string | undefined;
      errors.push({ index, id, errors: result.errors });
    }
  });

  return { calculators, errors };
}
