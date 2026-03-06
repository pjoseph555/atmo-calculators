/**
 * Calculator Schema — single source of truth for all calculator definitions.
 * The builder reads/writes this, the renderer consumes it, import/export serializes it.
 */

// ─── Unit Conversion ────────────────────────────────────────────────────────

export interface UnitOption {
  label: string;      // e.g. "kg", "lb"
  factor: number;     // multiply by this to convert TO the base unit
                      // e.g. lb → kg: factor = 0.453592
}

// ─── Input Fields ────────────────────────────────────────────────────────────

export interface NumericInput {
  type: "numeric";
  id: string;
  label: string;
  placeholder?: string;
  min?: number;
  max?: number;
  defaultUnit?: string;        // label of the default unit
  units?: UnitOption[];        // if present, user can switch units
}

export interface DropdownOption {
  label: string;
  value: number;               // numeric value used in formulas
}

export interface DropdownInput {
  type: "dropdown";
  id: string;
  label: string;
  options: DropdownOption[];
  defaultValue?: number;
}

export interface DateInput {
  type: "date";
  id: string;
  label: string;
}

export type CalcInput = NumericInput | DropdownInput | DateInput;

// ─── Output Fields ───────────────────────────────────────────────────────────

export interface NumericOutput {
  type: "numeric";
  id: string;
  label: string;
  formula: string;             // standard math notation, references input/output ids
  precision?: number;          // decimal places to display
  defaultUnit?: string;
  units?: UnitOption[];
  hidden?: boolean;            // computed but not shown to user; usable in other formulas
}

export interface DateOutput {
  type: "date";
  id: string;
  label: string;
  formula: string;
}

export type CalcOutput = NumericOutput | DateOutput;

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ReportVariant {
  id: string;
  template: string;            // text with {output_id} interpolation, e.g. "BMI is {bmi}."
}

export interface ReportConfig {
  formula: string;             // evaluates to a variant id
  variants: ReportVariant[];
}

// ─── Calculator Definition ────────────────────────────────────────────────────

export type CalcStatus = "draft" | "active" | "deprecated";
export type CalcComplexity = "simple" | "moderate" | "complex";

export interface CalculatorDefinition {
  id: string;                  // unique slug, e.g. "bsa-mosteller"
  name: string;
  description?: string;
  category?: string;
  status: CalcStatus;
  complexity: CalcComplexity;
  inputs: CalcInput[];
  outputs: CalcOutput[];
  report?: ReportConfig;
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
  version: number;             // incremented on each save
}

// ─── Library ─────────────────────────────────────────────────────────────────

export interface CalculatorLibrary {
  schemaVersion: "1.0";
  calculators: CalculatorDefinition[];
}
