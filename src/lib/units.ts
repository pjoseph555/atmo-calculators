/**
 * Unit conversion utilities.
 *
 * Each UnitOption has a `factor` that converts FROM that unit TO the base unit.
 * Example: lb → kg factor = 0.453592, so 150 lb * 0.453592 = 68.04 kg (base)
 *
 * To display a base-unit value in a chosen unit: divide by factor.
 */

import type { UnitOption } from "@/types/calculator";

/**
 * Convert a value from a user-selected unit to the base unit.
 * The base unit is the one with factor = 1, or the first unit in the list.
 */
export function toBaseUnit(value: number, unitLabel: string, units: UnitOption[]): number {
  const unit = units.find((u) => u.label === unitLabel);
  if (!unit) return value;
  return value * unit.factor;
}

/**
 * Convert a value from the base unit to a display unit.
 */
export function fromBaseUnit(value: number, unitLabel: string, units: UnitOption[]): number {
  const unit = units.find((u) => u.label === unitLabel);
  if (!unit) return value;
  return value / unit.factor;
}

/**
 * Get the base unit label (factor === 1, or first in list).
 */
export function getBaseUnit(units: UnitOption[]): string {
  return units.find((u) => u.factor === 1)?.label ?? units[0]?.label ?? "";
}
