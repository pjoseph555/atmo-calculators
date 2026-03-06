/**
 * Calculator engine — given a CalculatorDefinition and current input values,
 * evaluates all outputs and the report.
 *
 * Input values are in their currently-selected display units.
 * The engine converts to base units before formula evaluation.
 * Output values are returned in base units; the renderer converts for display.
 */

import type { CalculatorDefinition, NumericOutput } from "@/types/calculator";
import { evaluateFormula, evaluateReportFormula } from "@/lib/formula";
import { toBaseUnit } from "@/lib/units";

export interface EngineInputValues {
  // fieldId → numeric value in the user's selected unit
  [fieldId: string]: number | undefined;
}

export interface EngineUnitSelections {
  // fieldId → selected unit label
  [fieldId: string]: string;
}

export interface EngineOutputValues {
  // outputId → computed value in base units (NaN if formula failed)
  [outputId: string]: number;
}

export interface EngineResult {
  outputs: EngineOutputValues;
  reportText: string | null;   // rendered report text, or null if no report
  errors: Record<string, string>; // outputId → error message if formula threw
}

/**
 * Run the calculator engine.
 *
 * @param definition  The calculator definition
 * @param rawValues   Input values in the user's selected units
 * @param unitSelections  The currently selected unit label for each field
 */
export function runCalculator(
  definition: CalculatorDefinition,
  rawValues: EngineInputValues,
  unitSelections: EngineUnitSelections
): EngineResult {
  const errors: Record<string, string> = {};

  // Build the variable scope: all inputs converted to base units
  const scope: Record<string, number> = {};

  for (const input of definition.inputs) {
    const raw = rawValues[input.id];
    if (raw === undefined || isNaN(raw)) continue;

    if (input.type === "numeric" && input.units && input.units.length > 0) {
      const selectedUnit = unitSelections[input.id] ?? input.defaultUnit ?? input.units[0].label;
      scope[input.id] = toBaseUnit(raw, selectedUnit, input.units);
    } else {
      scope[input.id] = raw;
    }
  }

  // Evaluate outputs in declaration order (author is responsible for dependency order)
  const outputValues: EngineOutputValues = {};

  for (const output of definition.outputs) {
    if (output.type !== "numeric") continue;
    const numOutput = output as NumericOutput;

    try {
      // Scope includes previously computed outputs so later outputs can reference earlier ones
      const value = evaluateFormula(numOutput.formula, { ...scope, ...outputValues });
      outputValues[output.id] = value;
      scope[output.id] = value; // make available for subsequent outputs
    } catch (err) {
      errors[output.id] = err instanceof Error ? err.message : String(err);
      outputValues[output.id] = NaN;
    }
  }

  // Evaluate report
  let reportText: string | null = null;
  if (definition.report) {
    try {
      const variantKey = evaluateReportFormula(definition.report.formula, {
        ...scope,
        ...outputValues,
      }).replace(/^['"]|['"]$/g, "");
      const variant = definition.report.variants.find((v) => v.id === variantKey);
      if (variant) {
        reportText = interpolateReport(variant.template, outputValues);
      }
    } catch {
      // report errors are non-fatal
    }
  }

  return { outputs: outputValues, reportText, errors };
}

/**
 * Replace {outputId} placeholders in a report template with computed values.
 */
function interpolateReport(
  template: string,
  outputs: EngineOutputValues
): string {
  return template.replace(/\{(\w+)\}/g, (_match, id) => {
    const val = outputs[id];
    if (val === undefined || isNaN(val)) return "—";
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  });
}
