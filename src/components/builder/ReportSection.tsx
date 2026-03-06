"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { ReportConfig, ReportVariant, CalcInput, CalcOutput } from "@/types/calculator";

interface Props {
  report: ReportConfig | undefined;
  inputs: CalcInput[];
  outputs: CalcOutput[];
  onChange: (report: ReportConfig | undefined) => void;
}

export function ReportSection({ report, inputs, outputs, onChange }: Props) {
  const allVars = [...inputs.map((i) => i.id), ...outputs.map((o) => o.id)];
  const enabled = !!report;

  function enable() {
    onChange({
      formula: "",
      variants: [{ id: "default", template: "" }],
    });
  }

  function disable() {
    onChange(undefined);
  }

  function updateFormula(formula: string) {
    if (!report) return;
    onChange({ ...report, formula });
  }

  function updateVariant(index: number, patch: Partial<ReportVariant>) {
    if (!report) return;
    const next = report.variants.map((v, i) =>
      i === index ? { ...v, ...patch } : v
    );
    onChange({ ...report, variants: next });
  }

  function addVariant() {
    if (!report) return;
    onChange({
      ...report,
      variants: [
        ...report.variants,
        { id: `variant_${report.variants.length + 1}`, template: "" },
      ],
    });
  }

  function removeVariant(index: number) {
    if (!report) return;
    onChange({
      ...report,
      variants: report.variants.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="report-enabled"
          checked={enabled}
          onCheckedChange={(v) => (v ? enable() : disable())}
        />
        <Label htmlFor="report-enabled" className="cursor-pointer">
          Enable interpretive report
        </Label>
      </div>

      {enabled && report && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">
              Selection Formula{" "}
              <span className="text-muted-foreground font-normal">
                — evaluates to a variant ID (string or number)
              </span>
            </Label>
            <Textarea
              value={report.formula}
              onChange={(e) => updateFormula(e.target.value)}
              placeholder="e.g. IF(bmi < 18.5, 'underweight', IF(bmi < 25, 'normal', 'overweight'))"
              className="font-mono text-sm"
              rows={2}
            />
            {allVars.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Available:{" "}
                {allVars.map((v) => (
                  <code key={v} className="bg-muted px-1 py-0.5 rounded text-xs mr-1">
                    {v}
                  </code>
                ))}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Variants
            </Label>
            {report.variants.map((variant, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Variant ID</Label>
                    <Input
                      value={variant.id}
                      onChange={(e) => updateVariant(i, { id: e.target.value })}
                      placeholder="e.g. normal"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeVariant(i)}
                    className="mt-5 text-destructive hover:text-destructive"
                    disabled={report.variants.length === 1}
                  >
                    ✕
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Template{" "}
                    <span className="text-muted-foreground font-normal">
                      — use {"{"}outputId{"}"} to interpolate values
                    </span>
                  </Label>
                  <Textarea
                    value={variant.template}
                    onChange={(e) => updateVariant(i, { template: e.target.value })}
                    placeholder="e.g. BMI is {bmi}. Normal weight."
                    rows={2}
                  />
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addVariant}>
              + Add Variant
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
