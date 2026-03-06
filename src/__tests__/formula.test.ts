import { evaluateFormula, validateFormulaSyntax } from "@/lib/formula";

describe("evaluateFormula", () => {
  it("basic arithmetic", () => {
    expect(evaluateFormula("2 + 3", {})).toBe(5);
    expect(evaluateFormula("10 - 4", {})).toBe(6);
    expect(evaluateFormula("3 * 4", {})).toBe(12);
    expect(evaluateFormula("10 / 4", {})).toBeCloseTo(2.5);
  });

  it("power operator", () => {
    expect(evaluateFormula("2 ^ 3", {})).toBe(8);
    expect(evaluateFormula("9 ^ 0.5", {})).toBeCloseTo(3);
  });

  it("sqrt and ln", () => {
    expect(evaluateFormula("sqrt(16)", {})).toBe(4);
    expect(evaluateFormula("ln(1)", {})).toBe(0);
    expect(evaluateFormula("ln(2.718281828)", {})).toBeCloseTo(1, 4);
  });

  it("named variables", () => {
    expect(evaluateFormula("weight / (height ^ 2)", { weight: 70, height: 1.75 })).toBeCloseTo(22.86, 1);
  });

  it("comparison operators return 0 or 1", () => {
    expect(evaluateFormula("5 > 3", {})).toBe(1);
    expect(evaluateFormula("3 > 5", {})).toBe(0);
    expect(evaluateFormula("5 == 5", {})).toBe(1);
    expect(evaluateFormula("5 == 4", {})).toBe(0);
    expect(evaluateFormula("5 >= 5", {})).toBe(1);
    expect(evaluateFormula("4 <= 5", {})).toBe(1);
  });

  it("AND / OR (case-insensitive)", () => {
    expect(evaluateFormula("1 AND 1", {})).toBe(1);
    expect(evaluateFormula("1 AND 0", {})).toBe(0);
    expect(evaluateFormula("0 OR 1", {})).toBe(1);
    expect(evaluateFormula("0 or 0", {})).toBe(0);
  });

  it("IF(cond, a, b) conditional", () => {
    expect(evaluateFormula("IF(sex == 1, 50 + 2.3 * height, 45.5 + 2.3 * height)", { sex: 1, height: 5 })).toBeCloseTo(61.5);
    expect(evaluateFormula("IF(sex == 1, 50 + 2.3 * height, 45.5 + 2.3 * height)", { sex: 0, height: 5 })).toBeCloseTo(57);
  });

  it("nested IF", () => {
    const formula = "IF(bmi < 18.5, 1, IF(bmi < 25, 2, IF(bmi < 30, 3, 4)))";
    expect(evaluateFormula(formula, { bmi: 17 })).toBe(1);
    expect(evaluateFormula(formula, { bmi: 22 })).toBe(2);
    expect(evaluateFormula(formula, { bmi: 27 })).toBe(3);
    expect(evaluateFormula(formula, { bmi: 35 })).toBe(4);
  });

  it("output-to-output reference", () => {
    const bmi = evaluateFormula("weight / (height ^ 2)", { weight: 70, height: 1.75 });
    const classification = evaluateFormula("IF(bmi < 25, 1, 2)", { bmi });
    expect(classification).toBe(1);
  });

  it("complex realistic formula (IBW Devine)", () => {
    // IBW (male) = 50 + 2.3 * (height_in - 60)
    const result = evaluateFormula("50 + 2.3 * (height - 60)", { height: 70 });
    expect(result).toBeCloseTo(73);
  });
});

describe("validateFormulaSyntax", () => {
  it("returns null for valid formulas", () => {
    expect(validateFormulaSyntax("weight / height ^ 2", ["weight", "height"])).toBeNull();
    expect(validateFormulaSyntax("IF(x > 0, x, 0 - x)", ["x"])).toBeNull();
  });

  it("returns error string for invalid formulas", () => {
    expect(validateFormulaSyntax("weight /", ["weight"])).not.toBeNull();
    expect(validateFormulaSyntax("weight ** height", ["weight", "height"])).not.toBeNull(); // ** not supported
  });
});
