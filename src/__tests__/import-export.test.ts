import { validateCalculator, parseImport } from "@/lib/schema-validator";
import { generateHtml } from "@/lib/export-html";
import type { CalculatorDefinition } from "@/types/calculator";

const now = new Date().toISOString();

const validCalc: CalculatorDefinition = {
  id: "bmi",
  name: "BMI",
  status: "active",
  complexity: "simple",
  inputs: [
    { type: "numeric", id: "weight", label: "Weight" },
    { type: "numeric", id: "height", label: "Height" },
  ],
  outputs: [
    { type: "numeric", id: "bmi", label: "BMI", formula: "weight / height ^ 2" },
  ],
  version: 1,
  createdAt: now,
  updatedAt: now,
};

describe("validateCalculator", () => {
  it("accepts a valid calculator", () => {
    const result = validateCalculator(validCalc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing id", () => {
    const result = validateCalculator({ ...validCalc, id: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"id"'))).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = validateCalculator({ ...validCalc, status: "published" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });

  it("rejects invalid complexity", () => {
    const result = validateCalculator({ ...validCalc, complexity: "very-hard" });
    expect(result.valid).toBe(false);
  });

  it("rejects dropdown input with no options", () => {
    const result = validateCalculator({
      ...validCalc,
      inputs: [{ type: "dropdown", id: "sex", label: "Sex", options: [] }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("options"))).toBe(true);
  });

  it("rejects numeric output without formula", () => {
    const result = validateCalculator({
      ...validCalc,
      outputs: [{ type: "numeric", id: "bmi", label: "BMI" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("formula"))).toBe(true);
  });

  it("rejects non-object input", () => {
    const result = validateCalculator("not an object");
    expect(result.valid).toBe(false);
  });
});

describe("parseImport", () => {
  it("parses a single valid calculator", () => {
    const { calculators, errors } = parseImport(validCalc);
    expect(calculators).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("parses an array of calculators", () => {
    const { calculators, errors } = parseImport([validCalc, validCalc]);
    expect(calculators).toHaveLength(2);
    expect(errors).toHaveLength(0);
  });

  it("separates valid and invalid items", () => {
    const bad = { id: "", name: "", status: "bad", complexity: "bad", inputs: [], outputs: [] };
    const { calculators, errors } = parseImport([validCalc, bad]);
    expect(calculators).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(1);
  });
});

describe("generateHtml", () => {
  it("returns a valid HTML string", () => {
    const html = generateHtml(validCalc);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>BMI</title>");
    expect(html).toContain("var CALC =");
    expect(html).toContain('"id": "bmi"');
    expect(html).toContain("function init(def)");
    expect(html).toContain("function calcEval");
  });

  it("escapes name in HTML tags and script-breaking sequences in JSON", () => {
    const xssCalc = { ...validCalc, name: 'Calc</script><script>alert("xss")</script>' };
    const html = generateHtml(xssCalc);
    // Title and heading are HTML-escaped
    expect(html).toContain("&lt;/script&gt;");
    // The </script> inside the embedded JSON is escaped so it cannot break the script block
    const scriptBlock = html.slice(html.indexOf("<script>"), html.lastIndexOf("</script>"));
    expect(scriptBlock).not.toContain("</script>");
  });

  it("includes calculator definition as JSON", () => {
    const html = generateHtml(validCalc);
    expect(html).toContain('"weight / height ^ 2"');
  });
});
