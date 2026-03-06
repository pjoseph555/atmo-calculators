/**
 * Formula evaluator — wraps mathjs to support the calculator formula syntax.
 *
 * Supported syntax:
 *   Arithmetic:   + - * / ^ (power)
 *   Functions:    sqrt(x), ln(x), abs(x), round(x, n), floor(x), ceil(x)
 *   Comparisons:  == != > >= < <=
 *   Logic:        AND OR (case-insensitive, registered as functions)
 *   Conditional:  IF(condition, trueValue, falseValue)  — eagerly evaluated
 *   Variables:    any input/output id used by name, e.g. weight, height
 */

import { create, all } from "mathjs";

const math = create(all);

// Register custom functions
math.import(
  {
    // ln = natural log
    ln: (x: number) => Math.log(x),

    // IF(condition, trueVal, falseVal) — mathjs uses eager evaluation so both
    // branches evaluate, which is fine since our formulas have no side effects
    IF: (condition: number | boolean, trueVal: number | string, falseVal: number | string) =>
      condition ? trueVal : falseVal,
  },
  { override: true }
);

/**
 * Normalize AND/OR to lowercase for mathjs (which uses `and`/`or`).
 */
function preprocess(formula: string): string {
  return formula.replace(/\bAND\b/g, "and").replace(/\bOR\b/g, "or");
}

/**
 * Evaluate a formula that returns a number.
 * Throws on syntax errors or missing variables.
 */
export function evaluateFormula(
  formula: string,
  variables: Record<string, number>
): number {
  const result = math.evaluate(preprocess(formula), { ...variables });

  if (typeof result === "boolean") return result ? 1 : 0;
  if (typeof result === "number") return result;
  if (result && typeof result.toNumber === "function") return result.toNumber();

  throw new Error(
    `Formula did not return a number. Got: ${JSON.stringify(result)} — "${formula}"`
  );
}

/**
 * Evaluate a formula that may return a string (used for report selection formulas).
 * Returns a string or number.
 */
export function evaluateReportFormula(
  formula: string,
  variables: Record<string, number>
): string {
  const result = math.evaluate(preprocess(formula), { ...variables });

  if (typeof result === "string") return result;
  if (typeof result === "number") return String(result);
  if (typeof result === "boolean") return result ? "1" : "0";
  if (result && typeof result.toNumber === "function") return String(result.toNumber());

  return String(result);
}

/**
 * Check if a formula is syntactically valid given a set of known variable names.
 * Returns null if valid, or an error message string if not.
 */
export function validateFormulaSyntax(
  formula: string,
  knownVariables: string[]
): string | null {
  try {
    const scope: Record<string, number> = {};
    for (const v of knownVariables) scope[v] = 1;
    evaluateFormula(formula, scope);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
