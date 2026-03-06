import { runCalculator } from "@/lib/engine";
import type { CalculatorDefinition } from "@/types/calculator";

const now = new Date().toISOString();

function makeCalc(overrides: Partial<CalculatorDefinition>): CalculatorDefinition {
  return {
    id: "test",
    name: "Test",
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

describe("runCalculator — BMI", () => {
  const bmiCalc = makeCalc({
    inputs: [
      { type: "numeric", id: "weight", label: "Weight", units: [{ label: "kg", factor: 1 }, { label: "lb", factor: 0.453592 }], defaultUnit: "kg" },
      { type: "numeric", id: "height", label: "Height", units: [{ label: "m", factor: 1 }, { label: "cm", factor: 0.01 }], defaultUnit: "m" },
    ],
    outputs: [
      { type: "numeric", id: "bmi", label: "BMI", formula: "weight / (height ^ 2)", precision: 1 },
    ],
  });

  it("computes BMI correctly in base units", () => {
    const result = runCalculator(bmiCalc, { weight: 70, height: 1.75 }, { weight: "kg", height: "m" });
    expect(result.outputs.bmi).toBeCloseTo(22.86, 1);
    expect(result.errors).toEqual({});
  });

  it("converts lb to kg before computing", () => {
    // 154.3 lb ≈ 70 kg
    const result = runCalculator(bmiCalc, { weight: 154.3, height: 1.75 }, { weight: "lb", height: "m" });
    expect(result.outputs.bmi).toBeCloseTo(22.86, 0);
  });

  it("converts cm to m before computing", () => {
    // 175 cm = 1.75 m
    const result = runCalculator(bmiCalc, { weight: 70, height: 175 }, { weight: "kg", height: "cm" });
    expect(result.outputs.bmi).toBeCloseTo(22.86, 1);
  });

  it("returns NaN for missing inputs", () => {
    const result = runCalculator(bmiCalc, { weight: 70 }, { weight: "kg", height: "m" });
    expect(result.outputs.bmi).toBeNaN();
  });
});

describe("runCalculator — output chaining", () => {
  const chainCalc = makeCalc({
    inputs: [
      { type: "numeric", id: "weight", label: "Weight" },
      { type: "numeric", id: "height", label: "Height" },
    ],
    outputs: [
      { type: "numeric", id: "bmi", label: "BMI", formula: "weight / (height ^ 2)" },
      { type: "numeric", id: "category", label: "Category", formula: "IF(bmi < 18.5, 1, IF(bmi < 25, 2, IF(bmi < 30, 3, 4)))" },
    ],
  });

  it("second output references first output", () => {
    const result = runCalculator(chainCalc, { weight: 70, height: 1.75 }, {});
    expect(result.outputs.bmi).toBeCloseTo(22.86, 1);
    expect(result.outputs.category).toBe(2); // normal range
  });
});

describe("runCalculator — conditional (IBW Devine)", () => {
  const ibwCalc = makeCalc({
    inputs: [
      { type: "numeric", id: "height", label: "Height (in)", units: [{ label: "in", factor: 1 }], defaultUnit: "in" },
      { type: "dropdown", id: "sex", label: "Sex", options: [{ label: "Male", value: 1 }, { label: "Female", value: 0 }] },
    ],
    outputs: [
      { type: "numeric", id: "ibw", label: "IBW (kg)", formula: "IF(sex == 1, 50 + 2.3 * (height - 60), 45.5 + 2.3 * (height - 60))", precision: 1 },
    ],
  });

  it("male IBW", () => {
    const result = runCalculator(ibwCalc, { height: 70, sex: 1 }, { height: "in" });
    expect(result.outputs.ibw).toBeCloseTo(73, 0);
  });

  it("female IBW", () => {
    const result = runCalculator(ibwCalc, { height: 64, sex: 0 }, { height: "in" });
    expect(result.outputs.ibw).toBeCloseTo(54.7, 0);
  });
});

describe("runCalculator — report", () => {
  const reportCalc = makeCalc({
    inputs: [
      { type: "numeric", id: "weight", label: "Weight" },
      { type: "numeric", id: "height", label: "Height" },
    ],
    outputs: [
      { type: "numeric", id: "bmi", label: "BMI", formula: "weight / (height ^ 2)", precision: 1 },
    ],
    report: {
      formula: "IF(bmi < 18.5, 'underweight', IF(bmi < 25, 'normal', 'overweight'))",
      variants: [
        { id: "underweight", template: "BMI is {bmi}. Underweight." },
        { id: "normal", template: "BMI is {bmi}. Normal range." },
        { id: "overweight", template: "BMI is {bmi}. Overweight." },
      ],
    },
  });

  it("selects correct report variant and interpolates value", () => {
    const result = runCalculator(reportCalc, { weight: 70, height: 1.75 }, {});
    expect(result.reportText).toContain("Normal range");
    expect(result.reportText).toContain("22.8");
  });
});
