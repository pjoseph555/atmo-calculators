/**
 * Validates that every migrated calculator:
 * 1. Has a valid schema
 * 2. All output formulas parse and evaluate without throwing
 * 3. Report formulas (if any) parse and evaluate
 *
 * Usage: npx tsx scripts/validate-all.ts
 */

import fs from "fs";
import path from "path";
import type { CalculatorDefinition, NumericOutput } from "../src/types/calculator";
import { evaluateFormula, evaluateReportFormula } from "../src/lib/formula";
import { validateCalculator } from "../src/lib/schema-validator";

const DATA_DIR = path.join(__dirname, "../src/data/calculators");

const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json") && !f.startsWith("_"));
console.log(`Validating ${files.length} calculators...\n`);

let passed = 0, failed = 0;
const failures: { id: string; errors: string[] }[] = [];

for (const file of files.sort()) {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
  const calc = raw as CalculatorDefinition;
  const errors: string[] = [];

  // 1. Schema validation
  const schemaResult = validateCalculator(raw);
  if (!schemaResult.valid) {
    errors.push(...schemaResult.errors.map(e => `Schema: ${e}`));
  }

  if (errors.length === 0) {
    // 2. Build dummy scope: all inputs = 1
    const scope: Record<string, number> = {};
    for (const inp of calc.inputs) {
      scope[inp.id] = inp.type === "dropdown"
        ? (inp.options[0]?.value ?? 1)
        : 1;
    }

    // 3. Try evaluating each output formula in order
    for (const out of calc.outputs) {
      if (out.type !== "numeric") continue;
      const numOut = out as NumericOutput;
      if (!numOut.formula) continue;
      try {
        const val = evaluateFormula(numOut.formula, { ...scope });
        scope[out.id] = isNaN(val) ? 1 : val; // make available for chained outputs
      } catch (err) {
        errors.push(`Output "${out.id}" formula "${numOut.formula}": ${err instanceof Error ? err.message : err}`);
        scope[out.id] = 1;
      }
    }

    // 4. Report formula
    if (calc.report?.formula) {
      try {
        evaluateReportFormula(calc.report.formula, { ...scope });
      } catch (err) {
        errors.push(`Report formula: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (errors.length === 0) {
    passed++;
  } else {
    failed++;
    failures.push({ id: calc.id, errors });
    console.log(`FAIL ${calc.id}`);
    errors.forEach(e => console.log(`     ${e}`));
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`✓ Passed: ${passed}  ✗ Failed: ${failed}  Total: ${files.length}`);

if (failures.length > 0) {
  console.log(`\nFailed calculators:`);
  failures.forEach(f => console.log(`  - ${f.id}: ${f.errors[0]}`));
  process.exit(1);
} else {
  console.log(`\nAll calculators validated successfully!`);
}
