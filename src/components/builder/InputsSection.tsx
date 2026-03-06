"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type {
  CalcInput,
  NumericInput,
  DropdownInput,
  UnitOption,
  DropdownOption,
} from "@/types/calculator";

interface Props {
  inputs: CalcInput[];
  onChange: (inputs: CalcInput[]) => void;
}

export function InputsSection({ inputs, onChange }: Props) {
  const [addType, setAddType] = useState<CalcInput["type"]>("numeric");

  function addInput() {
    const id = `input_${Date.now()}`;
    let newInput: CalcInput;
    if (addType === "numeric") {
      newInput = { type: "numeric", id, label: "New Input" };
    } else if (addType === "dropdown") {
      newInput = {
        type: "dropdown",
        id,
        label: "New Dropdown",
        options: [{ label: "Option 1", value: 1 }],
      };
    } else {
      newInput = { type: "date", id, label: "New Date" };
    }
    onChange([...inputs, newInput]);
  }

  function removeInput(index: number) {
    onChange(inputs.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...inputs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === inputs.length - 1) return;
    const next = [...inputs];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function updateInput(index: number, patch: Partial<CalcInput>) {
    const next = inputs.map((inp, i) =>
      i === index ? ({ ...inp, ...patch } as CalcInput) : inp
    );
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {inputs.length === 0 && (
        <p className="text-sm text-muted-foreground">No inputs yet.</p>
      )}

      <Accordion type="multiple" className="space-y-2">
        {inputs.map((input, i) => (
          <AccordionItem
            key={input.id}
            value={input.id}
            className="border rounded-lg px-3"
          >
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                  {input.type}
                </span>
                <span className="text-sm font-medium">{input.label}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({input.id})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-3">
              <CommonInputFields
                input={input}
                onChange={(patch) => updateInput(i, patch)}
              />
              {input.type === "numeric" && (
                <NumericInputFields
                  input={input as NumericInput}
                  onChange={(patch) => updateInput(i, patch)}
                />
              )}
              {input.type === "dropdown" && (
                <DropdownInputFields
                  input={input as DropdownInput}
                  onChange={(patch) => updateInput(i, patch)}
                />
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveDown(i)}
                  disabled={i === inputs.length - 1}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeInput(i)}
                  className="ml-auto"
                >
                  Remove
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex gap-2 pt-2">
        <Select
          value={addType}
          onValueChange={(v) => setAddType(v as CalcInput["type"])}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="numeric">Numeric</SelectItem>
            <SelectItem value="dropdown">Dropdown</SelectItem>
            <SelectItem value="date">Date</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={addInput}>
          + Add Input
        </Button>
      </div>
    </div>
  );
}

// ─── Shared fields (label + id) ───────────────────────────────────────────────

function CommonInputFields({
  input,
  onChange,
}: {
  input: CalcInput;
  onChange: (patch: Partial<CalcInput>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input
          value={input.label}
          onChange={(e) => onChange({ label: e.target.value } as Partial<CalcInput>)}
          placeholder="Displayed label"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">
          ID{" "}
          <span className="text-muted-foreground font-normal">
            (used in formulas)
          </span>
        </Label>
        <Input
          value={input.id}
          onChange={(e) => onChange({ id: e.target.value } as Partial<CalcInput>)}
          placeholder="e.g. weight"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

// ─── Numeric-specific fields ──────────────────────────────────────────────────

function NumericInputFields({
  input,
  onChange,
}: {
  input: NumericInput;
  onChange: (patch: Partial<NumericInput>) => void;
}) {
  function updateUnit(index: number, patch: Partial<UnitOption>) {
    const next = (input.units ?? []).map((u, i) =>
      i === index ? { ...u, ...patch } : u
    );
    onChange({ units: next });
  }

  function addUnit() {
    onChange({ units: [...(input.units ?? []), { label: "", factor: 1 }] });
  }

  function removeUnit(index: number) {
    onChange({ units: (input.units ?? []).filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            value={input.min ?? ""}
            onChange={(e) =>
              onChange({ min: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            placeholder="None"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            value={input.max ?? ""}
            onChange={(e) =>
              onChange({ max: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            placeholder="None"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Default Unit</Label>
          <Input
            value={input.defaultUnit ?? ""}
            onChange={(e) => onChange({ defaultUnit: e.target.value })}
            placeholder="e.g. kg"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Unit Conversions</Label>
        <div className="space-y-1.5">
          {(input.units ?? []).map((unit, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={unit.label}
                onChange={(e) => updateUnit(i, { label: e.target.value })}
                placeholder="Label (e.g. kg)"
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">×</span>
              <Input
                type="number"
                step="any"
                value={unit.factor}
                onChange={(e) => updateUnit(i, { factor: Number(e.target.value) })}
                placeholder="Factor"
                className="w-28 font-mono text-sm"
              />
              <span className="text-xs text-muted-foreground">= base</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeUnit(i)}
                className="ml-auto text-destructive hover:text-destructive"
              >
                ✕
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addUnit}>
            + Add Unit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Dropdown-specific fields ─────────────────────────────────────────────────

function DropdownInputFields({
  input,
  onChange,
}: {
  input: DropdownInput;
  onChange: (patch: Partial<DropdownInput>) => void;
}) {
  function updateOption(index: number, patch: Partial<DropdownOption>) {
    const next = input.options.map((o, i) =>
      i === index ? { ...o, ...patch } : o
    );
    onChange({ options: next });
  }

  function addOption() {
    onChange({
      options: [...input.options, { label: "New Option", value: input.options.length }],
    });
  }

  function removeOption(index: number) {
    onChange({ options: input.options.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">Options</Label>
      <div className="space-y-1.5">
        {input.options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              placeholder="Label"
            />
            <span className="text-xs text-muted-foreground shrink-0">value =</span>
            <Input
              type="number"
              step="any"
              value={opt.value}
              onChange={(e) => updateOption(i, { value: Number(e.target.value) })}
              className="w-24 font-mono text-sm"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeOption(i)}
              className="text-destructive hover:text-destructive"
            >
              ✕
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addOption}>
          + Add Option
        </Button>
      </div>
    </div>
  );
}
