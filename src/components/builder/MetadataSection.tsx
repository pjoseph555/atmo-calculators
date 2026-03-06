"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalculatorDefinition } from "@/types/calculator";

interface Props {
  calc: CalculatorDefinition;
  onChange: (patch: Partial<CalculatorDefinition>) => void;
}

export function MetadataSection({ calc, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          value={calc.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Body Mass Index (BMI)"
        />
      </div>

      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea
          value={calc.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Brief description of what this calculator does"
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label>Category</Label>
        <Input
          value={calc.category ?? ""}
          onChange={(e) => onChange({ category: e.target.value })}
          placeholder="e.g. Anthropometrics, Drug Dosing, Scoring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={calc.status}
            onValueChange={(v) =>
              onChange({ status: v as CalculatorDefinition["status"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Complexity</Label>
          <Select
            value={calc.complexity}
            onValueChange={(v) =>
              onChange({ complexity: v as CalculatorDefinition["complexity"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="complex">Complex</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
