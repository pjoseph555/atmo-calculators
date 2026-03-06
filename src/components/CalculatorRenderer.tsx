"use client";

/**
 * CalculatorRenderer — the shared rendering engine for both live preview and HTML export.
 * Takes a CalculatorDefinition and renders a fully interactive calculator.
 */

import { useState, useMemo, useCallback } from "react";
import type {
  CalculatorDefinition,
  NumericInput,
  DropdownInput,
  NumericOutput,
  CalcInput,
} from "@/types/calculator";
import { runCalculator } from "@/lib/engine";
import { fromBaseUnit } from "@/lib/units";
import { validateInputs } from "@/lib/validation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Props {
  definition: CalculatorDefinition;
  className?: string;
}

export function CalculatorRenderer({ definition, className }: Props) {
  // Raw input values (in the user's selected display unit)
  const [inputValues, setInputValues] = useState<Record<string, number | undefined>>({});
  // Selected unit label for each field
  const [unitSelections, setUnitSelections] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const input of definition.inputs) {
      if (input.type === "numeric" && input.units?.length) {
        defaults[input.id] = input.defaultUnit ?? input.units[0].label;
      }
      if (input.type === "dropdown" && input.options.length) {
        // store default dropdown value as string for select component
      }
    }
    return defaults;
  });

  // Default dropdown values
  const [dropdownValues, setDropdownValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const input of definition.inputs) {
      if (input.type === "dropdown" && input.defaultValue !== undefined) {
        defaults[input.id] = input.defaultValue;
      } else if (input.type === "dropdown" && input.options.length) {
        defaults[input.id] = input.options[0].value;
      }
    }
    return defaults;
  });

  // Output unit selections
  const [outputUnitSelections, setOutputUnitSelections] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const output of definition.outputs) {
      if (output.type === "numeric" && output.units?.length) {
        defaults[output.id] = output.defaultUnit ?? output.units[0].label;
      }
    }
    return defaults;
  });

  // Merge numeric and dropdown values for the engine
  const allInputValues = useMemo(
    () => ({ ...inputValues, ...dropdownValues }),
    [inputValues, dropdownValues]
  );

  const validationErrors = useMemo(
    () => validateInputs(definition.inputs, allInputValues),
    [definition.inputs, allInputValues]
  );

  const result = useMemo(
    () => runCalculator(definition, allInputValues, unitSelections),
    [definition, allInputValues, unitSelections]
  );

  const handleNumericChange = useCallback(
    (id: string, raw: string) => {
      const num = raw === "" ? undefined : parseFloat(raw);
      setInputValues((prev) => ({ ...prev, [id]: num }));
    },
    []
  );

  const handleUnitChange = useCallback((id: string, unit: string) => {
    setUnitSelections((prev) => ({ ...prev, [id]: unit }));
  }, []);

  const handleDropdownChange = useCallback((id: string, val: string) => {
    setDropdownValues((prev) => ({ ...prev, [id]: parseFloat(val) }));
  }, []);

  const handleOutputUnitChange = useCallback((id: string, unit: string) => {
    setOutputUnitSelections((prev) => ({ ...prev, [id]: unit }));
  }, []);

  return (
    <div className={className}>
      {/* Inputs */}
      <div className="space-y-4">
        {definition.inputs.map((input) => (
          <InputField
            key={input.id}
            input={input}
            inputValues={inputValues}
            dropdownValues={dropdownValues}
            unitSelections={unitSelections}
            error={validationErrors[input.id]}
            onNumericChange={handleNumericChange}
            onUnitChange={handleUnitChange}
            onDropdownChange={handleDropdownChange}
          />
        ))}
      </div>

      {/* Outputs */}
      {definition.outputs.some((o) => !("hidden" in o && o.hidden)) && (
        <>
          <Separator className="my-6" />
          <div className="space-y-3">
            {definition.outputs
              .filter((o) => !(o as NumericOutput).hidden)
              .map((output) => {
                if (output.type !== "numeric") return null;
                const numOutput = output as NumericOutput;
                const rawValue = result.outputs[output.id];
                const selectedUnit = outputUnitSelections[output.id];
                const displayValue =
                  !isNaN(rawValue) && selectedUnit && numOutput.units?.length
                    ? fromBaseUnit(rawValue, selectedUnit, numOutput.units)
                    : rawValue;
                const precision = numOutput.precision ?? 2;
                const displayStr =
                  rawValue === undefined || isNaN(rawValue)
                    ? "—"
                    : displayValue.toFixed(precision);

                return (
                  <Card key={output.id} className="bg-muted/40">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {output.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold tabular-nums">
                          {displayStr}
                        </span>
                        {numOutput.units && numOutput.units.length > 1 ? (
                          <Select
                            value={selectedUnit ?? numOutput.defaultUnit ?? numOutput.units[0].label}
                            onValueChange={(v) => handleOutputUnitChange(output.id, v)}
                          >
                            <SelectTrigger className="w-20 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {numOutput.units.map((u) => (
                                <SelectItem key={u.label} value={u.label}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          numOutput.defaultUnit && (
                            <span className="text-sm text-muted-foreground">
                              {numOutput.defaultUnit}
                            </span>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </>
      )}

      {/* Report */}
      {result.reportText && (
        <Card className="mt-4 border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="py-3 px-4">
            <p className="text-sm leading-relaxed">{result.reportText}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-component: individual input field ────────────────────────────────────

interface InputFieldProps {
  input: CalcInput;
  inputValues: Record<string, number | undefined>;
  dropdownValues: Record<string, number>;
  unitSelections: Record<string, string>;
  error?: string;
  onNumericChange: (id: string, val: string) => void;
  onUnitChange: (id: string, unit: string) => void;
  onDropdownChange: (id: string, val: string) => void;
}

function InputField({
  input,
  inputValues,
  dropdownValues,
  unitSelections,
  error,
  onNumericChange,
  onUnitChange,
  onDropdownChange,
}: InputFieldProps) {
  if (input.type === "numeric") {
    const ni = input as NumericInput;
    const hasUnits = ni.units && ni.units.length > 1;
    const selectedUnit = unitSelections[ni.id] ?? ni.defaultUnit;

    return (
      <div className="space-y-1">
        <Label htmlFor={ni.id}>{ni.label}</Label>
        <div className="flex gap-2">
          <Input
            id={ni.id}
            type="number"
            placeholder={ni.placeholder}
            value={inputValues[ni.id] ?? ""}
            onChange={(e) => onNumericChange(ni.id, e.target.value)}
            className={error ? "border-red-400" : ""}
          />
          {hasUnits && (
            <Select
              value={selectedUnit}
              onValueChange={(v) => onUnitChange(ni.id, v)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ni.units!.map((u) => (
                  <SelectItem key={u.label} value={u.label}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (input.type === "dropdown") {
    const di = input as DropdownInput;
    const currentVal = dropdownValues[di.id] ?? di.options[0]?.value;

    return (
      <div className="space-y-1">
        <Label htmlFor={di.id}>{di.label}</Label>
        <Select
          value={String(currentVal)}
          onValueChange={(v) => onDropdownChange(di.id, v)}
        >
          <SelectTrigger id={di.id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {di.options.map((opt) => (
              <SelectItem key={opt.label} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // date input — basic for now
  return (
    <div className="space-y-1">
      <Label htmlFor={input.id}>{input.label}</Label>
      <Input id={input.id} type="date" />
    </div>
  );
}

// Named export for use in preview panel
export default CalculatorRenderer;
