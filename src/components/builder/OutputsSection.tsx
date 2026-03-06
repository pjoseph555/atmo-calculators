"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CalcOutput, NumericOutput, CalcInput, UnitOption } from "@/types/calculator";

interface Props {
  outputs: CalcOutput[];
  inputs: CalcInput[];            // for showing available variable names
  onChange: (outputs: CalcOutput[]) => void;
}

export function OutputsSection({ outputs, inputs, onChange }: Props) {

  function addOutput() {
    const id = `output_${Date.now()}`;
    const newOutput: NumericOutput = {
      type: "numeric",
      id,
      label: "New Output",
      formula: "",
      precision: 2,
    };
    onChange([...outputs, newOutput]);
  }

  function removeOutput(index: number) {
    onChange(outputs.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...outputs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === outputs.length - 1) return;
    const next = [...outputs];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function updateOutput(index: number, patch: Partial<CalcOutput>) {
    const next = outputs.map((out, i) =>
      i === index ? { ...out, ...patch } : out
    );
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {outputs.length === 0 && (
        <p className="text-sm text-muted-foreground">No outputs yet.</p>
      )}

      <Accordion type="multiple" className="space-y-2">
        {outputs.map((output, i) => {
          const numOut = output as NumericOutput;
          const varsUpToHere = [
            ...inputs.map((inp) => inp.id),
            ...outputs.slice(0, i).map((o) => o.id),
          ];

          return (
            <AccordionItem
              key={output.id}
              value={output.id}
              className="border rounded-lg px-3"
            >
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                    {output.type}
                  </span>
                  <span className="text-sm font-medium">{output.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({output.id})
                  </span>
                  {numOut.hidden && (
                    <span className="text-xs text-muted-foreground italic">hidden</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                {/* Label + ID */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={output.label}
                      onChange={(e) => updateOutput(i, { label: e.target.value })}
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
                      value={output.id}
                      onChange={(e) => updateOutput(i, { id: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Formula */}
                <div className="space-y-1">
                  <Label className="text-xs">Formula</Label>
                  <Textarea
                    value={numOut.formula ?? ""}
                    onChange={(e) => updateOutput(i, { formula: e.target.value })}
                    placeholder="e.g. weight / (height ^ 2)"
                    className="font-mono text-sm"
                    rows={2}
                  />
                  {varsUpToHere.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Available:{" "}
                      {varsUpToHere.map((v) => (
                        <code
                          key={v}
                          className="bg-muted px-1 py-0.5 rounded text-xs mr-1 cursor-pointer"
                          onClick={() =>
                            updateOutput(i, {
                              formula: (numOut.formula ?? "") + v,
                            })
                          }
                        >
                          {v}
                        </code>
                      ))}
                    </p>
                  )}
                </div>

                {/* Precision + Default unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Decimal Places</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={numOut.precision ?? 2}
                      onChange={(e) =>
                        updateOutput(i, { precision: Number(e.target.value) })
                      }
                      className="w-20"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default Unit</Label>
                    <Input
                      value={numOut.defaultUnit ?? ""}
                      onChange={(e) =>
                        updateOutput(i, { defaultUnit: e.target.value })
                      }
                      placeholder="e.g. kg/m²"
                    />
                  </div>
                </div>

                {/* Units */}
                <OutputUnitsEditor
                  units={numOut.units ?? []}
                  onChange={(units) => updateOutput(i, { units })}
                />

                {/* Hidden toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id={`hidden-${output.id}`}
                    checked={numOut.hidden ?? false}
                    onCheckedChange={(v) => updateOutput(i, { hidden: v })}
                  />
                  <Label htmlFor={`hidden-${output.id}`} className="text-xs cursor-pointer">
                    Hidden (computed but not shown — usable in other formulas)
                  </Label>
                </div>

                {/* Reorder / remove */}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => moveUp(i)} disabled={i === 0}>↑</Button>
                  <Button size="sm" variant="outline" onClick={() => moveDown(i)} disabled={i === outputs.length - 1}>↓</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeOutput(i)} className="ml-auto">
                    Remove
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Button size="sm" onClick={addOutput}>
        + Add Output
      </Button>
    </div>
  );
}

function OutputUnitsEditor({
  units,
  onChange,
}: {
  units: UnitOption[];
  onChange: (units: UnitOption[]) => void;
}) {
  function updateUnit(index: number, patch: Partial<UnitOption>) {
    onChange(units.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">Output Unit Conversions</Label>
      <div className="space-y-1.5">
        {units.map((unit, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={unit.label}
              onChange={(e) => updateUnit(i, { label: e.target.value })}
              placeholder="Label"
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">×</span>
            <Input
              type="number"
              step="any"
              value={unit.factor}
              onChange={(e) => updateUnit(i, { factor: Number(e.target.value) })}
              className="w-28 font-mono text-sm"
            />
            <span className="text-xs text-muted-foreground">= base</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange(units.filter((_, j) => j !== i))}
              className="ml-auto text-destructive hover:text-destructive"
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange([...units, { label: "", factor: 1 }])}
        >
          + Add Unit
        </Button>
      </div>
    </div>
  );
}
