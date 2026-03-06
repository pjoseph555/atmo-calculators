/**
 * JSON file storage for calculator definitions.
 * Files live in src/data/calculators/*.json (one file per calculator).
 * Server-side only — these functions use Node.js fs APIs.
 */

import fs from "fs";
import path from "path";
import type { CalculatorDefinition } from "@/types/calculator";

const DATA_DIR = path.join(process.cwd(), "src", "data", "calculators");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export function listCalculators(): CalculatorDefinition[] {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, f), "utf-8");
    return JSON.parse(raw) as CalculatorDefinition;
  });
}

export function getCalculator(id: string): CalculatorDefinition | null {
  const fp = filePath(id);
  if (!fs.existsSync(fp)) return null;
  const raw = fs.readFileSync(fp, "utf-8");
  return JSON.parse(raw) as CalculatorDefinition;
}

export function saveCalculator(calc: CalculatorDefinition): void {
  ensureDataDir();
  calc.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath(calc.id), JSON.stringify(calc, null, 2), "utf-8");
}

export function deleteCalculator(id: string): boolean {
  const fp = filePath(id);
  if (!fs.existsSync(fp)) return false;
  fs.unlinkSync(fp);
  return true;
}

export function createCalculator(
  partial: Omit<CalculatorDefinition, "createdAt" | "updatedAt" | "version">
): CalculatorDefinition {
  const now = new Date().toISOString();
  const calc: CalculatorDefinition = {
    ...partial,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  saveCalculator(calc);
  return calc;
}
