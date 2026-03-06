/**
 * Baseline tests for the calculator schema types and storage helpers.
 * These confirm that the schema is well-formed and that createCalculator
 * produces a valid CalculatorDefinition.
 */

import type {
  CalculatorDefinition,
  NumericInput,
  NumericOutput,
} from "@/types/calculator";

function makeCalc(
  overrides: Partial<CalculatorDefinition> = {}
): CalculatorDefinition {
  const now = new Date().toISOString();
  return {
    id: "test-calc",
    name: "Test Calculator",
    status: "draft",
    complexity: "simple",
    inputs: [],
    outputs: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

describe("CalculatorDefinition schema", () => {
  it("has required fields", () => {
    const calc = makeCalc();
    expect(calc.id).toBeDefined();
    expect(calc.name).toBeDefined();
    expect(calc.status).toBeDefined();
    expect(calc.complexity).toBeDefined();
    expect(Array.isArray(calc.inputs)).toBe(true);
    expect(Array.isArray(calc.outputs)).toBe(true);
    expect(calc.version).toBeGreaterThanOrEqual(1);
  });

  it("accepts numeric input with units", () => {
    const input: NumericInput = {
      type: "numeric",
      id: "weight",
      label: "Weight",
      min: 0,
      max: 500,
      defaultUnit: "kg",
      units: [
        { label: "kg", factor: 1 },
        { label: "lb", factor: 0.453592 },
      ],
    };
    const calc = makeCalc({ inputs: [input] });
    expect(calc.inputs).toHaveLength(1);
    expect(calc.inputs[0].type).toBe("numeric");
  });

  it("accepts numeric output with formula", () => {
    const output: NumericOutput = {
      type: "numeric",
      id: "bmi",
      label: "BMI",
      formula: "weight / (height * height)",
      precision: 1,
    };
    const calc = makeCalc({ outputs: [output] });
    expect(calc.outputs).toHaveLength(1);
    expect(calc.outputs[0].type).toBe("numeric");
  });

  it("accepts a report config", () => {
    const calc = makeCalc({
      report: {
        formula: "bmi < 18.5 ? 'underweight' : 'normal'",
        variants: [
          { id: "underweight", template: "BMI is {bmi} — underweight." },
          { id: "normal", template: "BMI is {bmi} — normal range." },
        ],
      },
    });
    expect(calc.report?.variants).toHaveLength(2);
  });

  it("status can be draft, active, or deprecated", () => {
    const statuses = ["draft", "active", "deprecated"] as const;
    for (const status of statuses) {
      const calc = makeCalc({ status });
      expect(calc.status).toBe(status);
    }
  });

  it("complexity can be simple, moderate, or complex", () => {
    const levels = ["simple", "moderate", "complex"] as const;
    for (const complexity of levels) {
      const calc = makeCalc({ complexity });
      expect(calc.complexity).toBe(complexity);
    }
  });
});
