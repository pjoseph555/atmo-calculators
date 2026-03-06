/**
 * Migration script: converts legacy Xed HTML calculators to CalculatorDefinition JSON.
 *
 * Usage: npx tsx scripts/migrate-legacy.ts <path-to-zip>
 *
 * The legacy format uses RPN (Reverse Polish Notation) formulas with field
 * references like f1, f2 (inputs) and o1, o2 (outputs).
 * This script converts RPN to standard infix notation and maps field IDs to
 * slugified variable names derived from labels.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { CalculatorDefinition, CalcInput, CalcOutput, NumericInput, DropdownInput, NumericOutput, UnitOption, DropdownOption } from "../src/types/calculator";

const ZIP_PATH = process.argv[2] ?? "/Users/philipjoseph/claude-projects/AtmoCalculators/calc.usbmis.com.zip";
const OUT_DIR = path.join(__dirname, "../src/data/calculators");

// Calculators marked as deprecated in the brief
const DEPRECATED_IDS = new Set(["81304", "81343", "81353"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toVarName(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "field";
  // JS identifiers can't start with a digit
  return /^\d/.test(slug) ? `v${slug}` : slug;
}

function toSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return base || id;
}

// Make a variable name unique within a set
function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) { used.add(base); return base; }
  let n = 2;
  while (used.has(`${base}_${n}`)) n++;
  const name = `${base}_${n}`;
  used.add(name);
  return name;
}

// ─── RPN → Infix converter ────────────────────────────────────────────────────

type Precedence = Record<string, number>;
const PREC: Precedence = {
  "|": 1, "&": 2,
  "==": 3, "~=": 3, ">": 3, ">=": 3, "<": 3, "<=": 3,
  "+": 4, "-": 4,
  "*": 5, "/": 5,
  "^": 6,
};

function needsParens(expr: string, parentPrec: number, opPrec: number): boolean {
  return opPrec > parentPrec; // wrap lower-precedence sub-expressions
}

function rpnToInfix(rpn: string, fieldMap: Record<string, string>): string {
  const tokens = rpn.trim().split(/\s+/);
  // Stack stores { expr: string, prec: number }
  const stack: { expr: string; prec: number }[] = [];

  function pop() {
    return stack.pop() ?? { expr: "0", prec: 99 };
  }

  function wrap(item: { expr: string; prec: number }, minPrec: number) {
    return item.prec < minPrec ? `(${item.expr})` : item.expr;
  }

  for (const token of tokens) {
    if (token === "") continue;

    // Ternary: v1 v2 condition ? → IF(condition, v1, v2)
    if (token === "?") {
      const condition = pop();
      const falseVal = pop();
      const trueVal = pop();
      stack.push({
        expr: `IF(${condition.expr}, ${trueVal.expr}, ${falseVal.expr})`,
        prec: 99,
      });
      continue;
    }

    // Unary functions
    if (token === "ln" || token === "sqrt" || token === "abs") {
      const v = pop();
      stack.push({ expr: `${token}(${v.expr})`, prec: 99 });
      continue;
    }

    // Unary NOT
    if (token === "!") {
      const v = pop();
      stack.push({ expr: `(NOT ${v.expr})`, prec: 99 });
      continue;
    }

    // days() — TimeDelta for date math; wrap as-is
    if (token === "days") {
      const v = pop();
      stack.push({ expr: `days(${v.expr})`, prec: 99 });
      continue;
    }

    // get — null coalescing: use first if not null, else second
    if (token === "get") {
      const b = pop();
      const a = pop();
      // Approximate as IF(a != 0, a, b) — close enough for our use case
      stack.push({ expr: `IF(${a.expr} != 0, ${a.expr}, ${b.expr})`, prec: 99 });
      continue;
    }

    // Binary operators
    if (PREC[token] !== undefined) {
      const prec = PREC[token];
      const b = pop();
      const a = pop();
      let op = token;
      if (op === "|") op = "OR";
      else if (op === "&") op = "AND";
      else if (op === "~=") op = "!=";

      const aExpr = wrap(a, prec);
      const bExpr = wrap(b, prec + (op === "^" ? 0 : 1)); // right-assoc for ^
      stack.push({ expr: `${aExpr} ${op} ${bExpr}`, prec });
      continue;
    }

    // Field reference or numeric literal
    const mapped = fieldMap[token] ?? token;
    const num = parseFloat(token);
    stack.push({ expr: mapped, prec: isNaN(num) ? 99 : 99 });
  }

  return stack[0]?.expr ?? "";
}

// ─── HTML Parser ──────────────────────────────────────────────────────────────

interface LegacyField {
  id: string;       // f1, f2, o1, o2 etc.
  label: string;
  type: "input_float" | "input_dropdown" | "input_date" | "output_float" | "output_hidden";
  units?: { label: string; value: number }[];  // for input_float with units
  options?: { label: string; value: number }[]; // for input_dropdown
  unitLabel?: string;  // for output_float with a fixed unit label
}

interface LegacyCalc {
  id: string;
  title: string;
  fields: LegacyField[];
  formulas: Record<string, string>;
  reportFormula: string | null;
  reports: Record<string | number, string> | null;
  ranges: Record<string, { min?: number; max?: number }>;
}

function decodeHtml(s: string): string {
  return s.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function parseHtml(html: string, fileId: string): LegacyCalc {
  // Title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : fileId;

  // Split HTML on field div boundaries to extract each field block
  const fields: LegacyField[] = [];

  // Find all field div start positions: <div id="f1" ... or <div id="o1" ...
  const fieldStartRe = /<div id="(f\d+|o\d+)" data-input-type="([^"]+)"[^>]*>/gi;
  const fieldStarts: { index: number; id: string; type: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fieldStartRe.exec(html)) !== null) {
    fieldStarts.push({ index: m.index, id: m[1], type: m[2] });
  }

  for (let i = 0; i < fieldStarts.length; i++) {
    const { id: fieldId, type: fieldType, index: start } = fieldStarts[i];
    const end = fieldStarts[i + 1]?.index ?? html.indexOf('<div id="actions"', start);
    const block = html.slice(start, end > start ? end : start + 2000);

    // Label
    const labelMatch = block.match(/<div class="(?:input|output)_label">([^<]+)<\/div>/);
    const label = labelMatch ? decodeHtml(labelMatch[1].trim()) : fieldId;

    if (fieldType === "input_float") {
      const units: { label: string; value: number }[] = [];
      // Only grab units from the select.unit element (not output divs)
      const selectMatch = block.match(/<select[^>]*class="unit"[^>]*>([\s\S]*?)<\/select>/i);
      if (selectMatch) {
        const optRe = /<option value="([^"]+)">([^<]+)<\/option>/gi;
        let om: RegExpExecArray | null;
        while ((om = optRe.exec(selectMatch[1])) !== null) {
          units.push({ label: om[2].trim(), value: parseFloat(om[1]) });
        }
      }
      fields.push({ id: fieldId, label, type: "input_float", units: units.length ? units : undefined });

    } else if (fieldType === "input_dropdown") {
      const options: { label: string; value: number }[] = [];
      const selectMatch = block.match(/<select>([\s\S]*?)<\/select>/i);
      if (selectMatch) {
        const optRe = /<option value="([^"]+)">([^<]+)<\/option>/gi;
        let om: RegExpExecArray | null;
        while ((om = optRe.exec(selectMatch[1])) !== null) {
          options.push({ label: decodeHtml(om[2].trim()), value: parseFloat(om[1]) });
        }
      }
      fields.push({ id: fieldId, label, type: "input_dropdown", options });

    } else if (fieldType === "input_date") {
      fields.push({ id: fieldId, label, type: "input_date" });

    } else if (fieldType === "output_float") {
      const unitDivMatch = block.match(/<div class="unit">([^<]+)<\/div>/);
      fields.push({ id: fieldId, label, type: "output_float", unitLabel: unitDivMatch?.[1]?.trim() });

    } else if (fieldType === "output_hidden") {
      fields.push({ id: fieldId, label, type: "output_hidden" });
    }
  }

  // Formulas
  const formulasMatch = html.match(/var formulas = (\{[^}]+\})/);
  let formulas: Record<string, string> = {};
  if (formulasMatch) {
    try {
      formulas = JSON.parse(formulasMatch[1]);
    } catch {
      // Try eval-style parse with single quotes
      const fixed = formulasMatch[1].replace(/'/g, '"');
      try { formulas = JSON.parse(fixed); } catch { /* skip */ }
    }
  }

  // Report formula
  const reportFormulaMatch = html.match(/report_formula = '([^']+)'/);
  const reportFormula = reportFormulaMatch ? reportFormulaMatch[1] : null;

  // Reports object
  const reportsMatch = html.match(/reports = (\{[^}]+\}|\[[^\]]+\])/);
  let reports: Record<string | number, string> | null = null;
  if (reportsMatch) {
    try {
      reports = JSON.parse(reportsMatch[1].replace(/'/g, '"'));
    } catch { /* skip */ }
  }

  // Ranges
  const rangesMatch = html.match(/ranges = (\{[^}]*\})/);
  let ranges: Record<string, { min?: number; max?: number }> = {};
  if (rangesMatch) {
    try {
      ranges = JSON.parse(rangesMatch[1]);
    } catch { /* skip */ }
  }

  return { id: fileId, title, fields, formulas, reportFormula, reports, ranges };
}

// ─── Topological sort for outputs ────────────────────────────────────────────

function sortOutputs(
  outputIds: string[],
  formulas: Record<string, string>
): string[] {
  const deps: Record<string, Set<string>> = {};
  for (const id of outputIds) {
    deps[id] = new Set<string>();
    const formula = formulas[id] ?? "";
    for (const other of outputIds) {
      if (other !== id && formula.includes(other)) {
        deps[id].add(other);
      }
    }
  }

  const sorted: string[] = [];
  const visited = new Set<string>();

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of deps[id]) visit(dep);
    sorted.push(id);
  }

  for (const id of outputIds) visit(id);
  return sorted;
}

// ─── Convert legacy → CalculatorDefinition ───────────────────────────────────

function convertCalc(legacy: LegacyCalc): CalculatorDefinition {
  const now = new Date().toISOString();
  const usedNames = new Set<string>();

  // Build field ID → variable name map
  const fieldMap: Record<string, string> = {};
  for (const field of legacy.fields) {
    const base = toVarName(field.label);
    fieldMap[field.id] = uniqueName(base, usedNames);
  }

  // Inputs
  const inputs: CalcInput[] = [];
  for (const field of legacy.fields) {
    if (!field.id.startsWith("f")) continue;
    const varName = fieldMap[field.id];
    const range = legacy.ranges[field.id];

    if (field.type === "input_float") {
      const inp: NumericInput = {
        type: "numeric",
        id: varName,
        label: field.label,
        ...(range?.min !== undefined && { min: range.min }),
        ...(range?.max !== undefined && { max: range.max }),
      };
      if (field.units && field.units.length > 0) {
        // Legacy: option value is the multiplier to convert to base unit
        // Our schema: factor = multiplier to convert TO base unit (same convention)
        const base = field.units.find(u => u.value === 1) ?? field.units[0];
        inp.defaultUnit = base.label;
        inp.units = field.units.map(u => ({
          label: u.label,
          factor: u.value,
        })) as UnitOption[];
      }
      inputs.push(inp);

    } else if (field.type === "input_dropdown") {
      const inp: DropdownInput = {
        type: "dropdown",
        id: varName,
        label: field.label,
        options: (field.options ?? []).map(o => ({
          label: o.label,
          value: o.value,
        })) as DropdownOption[],
      };
      inputs.push(inp);

    } else if (field.type === "input_date") {
      inputs.push({ type: "date", id: varName, label: field.label });
    }
  }

  // Outputs (topologically sorted)
  const outputFields = legacy.fields.filter(f => f.id.startsWith("o"));
  const outputIds = outputFields.map(f => f.id);
  const sortedOutputIds = sortOutputs(outputIds, legacy.formulas);

  const outputs: CalcOutput[] = [];
  for (const oid of sortedOutputIds) {
    const field = outputFields.find(f => f.id === oid);
    if (!field) continue;

    const varName = fieldMap[oid];
    const rpn = legacy.formulas[oid] ?? "";

    // Convert RPN to infix using our variable names
    const infix = rpnToInfix(rpn, fieldMap);

    if (field.type === "output_float" || field.type === "output_hidden") {
      const out: NumericOutput = {
        type: "numeric",
        id: varName,
        label: field.label,
        formula: infix,
        precision: 2,
        ...(field.type === "output_hidden" && { hidden: true }),
        ...(field.unitLabel && { defaultUnit: field.unitLabel }),
      };
      outputs.push(out);
    }
  }

  // Report
  let report: CalculatorDefinition["report"] = undefined;
  if (legacy.reportFormula && legacy.reports) {
    const reportInfix = rpnToInfix(legacy.reportFormula, fieldMap);
    const variants = Object.entries(legacy.reports).map(([key, template]) => ({
      id: String(key),
      // Convert %o1% style interpolation to {varName} style
      template: String(template).replace(/%([fo]\d+)%/g, (_m, fid) => {
        return `{${fieldMap[fid] ?? fid}}`;
      }),
    }));
    report = { formula: reportInfix, variants };
  }

  // Complexity heuristic
  const totalFields = inputs.length + outputs.length;
  const hasConditionals = Object.values(legacy.formulas).some(f => f.includes("?"));
  const complexity: CalculatorDefinition["complexity"] =
    totalFields > 12 || (hasConditionals && totalFields > 6) ? "complex"
    : hasConditionals || totalFields > 4 ? "moderate"
    : "simple";

  return {
    id: toSlug(legacy.title, legacy.id),
    name: legacy.title,
    status: "active",
    complexity,
    inputs,
    outputs,
    ...(report && { report }),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(ZIP_PATH)) {
    console.error(`Zip not found: ${ZIP_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Get list of HTML files in the zip
  const listing = execSync(`unzip -l "${ZIP_PATH}"`, { encoding: "utf8" });
  const htmlFiles = listing
    .split("\n")
    .map(l => l.match(/calc\.usbmis\.com\/(\d+)\.html/))
    .filter(Boolean)
    .map(m => m![1]);

  console.log(`Found ${htmlFiles.length} calculators`);

  let converted = 0, skipped = 0, errors = 0;
  const results: { id: string; name: string; status: string }[] = [];

  for (const fileId of htmlFiles) {
    if (DEPRECATED_IDS.has(fileId)) {
      console.log(`  SKIP ${fileId} (deprecated)`);
      skipped++;
      continue;
    }

    try {
      const html = execSync(`unzip -p "${ZIP_PATH}" "calc.usbmis.com/${fileId}.html"`, {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });

      const legacy = parseHtml(html, fileId);
      const calc = convertCalc(legacy);

      // Handle duplicate slugs
      const outPath = path.join(OUT_DIR, `${calc.id}.json`);
      const finalId = fs.existsSync(outPath) ? `${calc.id}-${fileId}` : calc.id;
      calc.id = finalId;

      fs.writeFileSync(
        path.join(OUT_DIR, `${finalId}.json`),
        JSON.stringify(calc, null, 2),
        "utf8"
      );

      results.push({ id: finalId, name: calc.name, status: calc.complexity });
      converted++;
    } catch (err) {
      console.error(`  ERROR ${fileId}: ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  console.log(`\n✓ Converted: ${converted}  Skipped: ${skipped}  Errors: ${errors}`);
  console.log(`\nSample output:`);
  results.slice(0, 5).forEach(r => console.log(`  ${r.id} (${r.status}): ${r.name}`));

  // Write a migration report
  const report = {
    migratedAt: new Date().toISOString(),
    total: htmlFiles.length,
    converted,
    skipped,
    errors,
    calculators: results,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "_migration-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(`\nReport saved to src/data/calculators/_migration-report.json`);
}

main();
