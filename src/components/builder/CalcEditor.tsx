"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CalculatorRenderer } from "@/components/CalculatorRenderer";
import { MetadataSection } from "@/components/builder/MetadataSection";
import { InputsSection } from "@/components/builder/InputsSection";
import { OutputsSection } from "@/components/builder/OutputsSection";
import { ReportSection } from "@/components/builder/ReportSection";
import type { CalculatorDefinition } from "@/types/calculator";
import { uniqueSlug } from "@/lib/slug";

interface Props {
  /** Existing calculator to edit. If undefined, we're creating a new one. */
  initial?: CalculatorDefinition;
}

function blankCalc(): CalculatorDefinition {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    description: "",
    category: "",
    status: "draft",
    complexity: "simple",
    inputs: [],
    outputs: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function CalcEditor({ initial }: Props) {
  const router = useRouter();
  const isNew = !initial;
  const [calc, setCalc] = useState<CalculatorDefinition>(initial ?? blankCalc());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const patch = useCallback((update: Partial<CalculatorDefinition>) => {
    setCalc((prev) => ({ ...prev, ...update }));
    setDirty(true);
  }, []);

  async function save() {
    if (!calc.name.trim()) {
      toast.error("Calculator name is required.");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const id = uniqueSlug(calc.name);
        const body: CalculatorDefinition = { ...calc, id };
        const res = await fetch("/api/calculators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Calculator created!");
        router.push(`/calculators/${id}/edit`);
      } else {
        const res = await fetch(`/api/calculators/${calc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(calc),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        setCalc(updated);
        setDirty(false);
        toast.success("Saved!");
      }
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">
            {isNew ? "New Calculator" : calc.name || "Untitled"}
          </h1>
          {!isNew && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              ID: {calc.id} · v{calc.version}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            ← Library
          </Button>
          {!isNew && (
            <>
              <Button variant="outline" asChild>
                <a href={`/calculators/${calc.id}`} target="_blank">
                  Preview
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/calculators/${calc.id}/export`} download={`${calc.id}.html`}>
                  Export HTML
                </a>
              </Button>
            </>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create" : dirty ? "Save *" : "Save"}
          </Button>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Two-panel layout */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left: config tabs */}
        <div className="overflow-y-auto">
          <Tabs defaultValue="metadata">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="metadata">Info</TabsTrigger>
              <TabsTrigger value="inputs">
                Inputs{calc.inputs.length > 0 ? ` (${calc.inputs.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="outputs">
                Outputs{calc.outputs.length > 0 ? ` (${calc.outputs.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
            </TabsList>

            <TabsContent value="metadata">
              <MetadataSection calc={calc} onChange={patch} />
            </TabsContent>

            <TabsContent value="inputs">
              <InputsSection
                inputs={calc.inputs}
                onChange={(inputs) => patch({ inputs })}
              />
            </TabsContent>

            <TabsContent value="outputs">
              <OutputsSection
                outputs={calc.outputs}
                inputs={calc.inputs}
                onChange={(outputs) => patch({ outputs })}
              />
            </TabsContent>

            <TabsContent value="report">
              <ReportSection
                report={calc.report}
                inputs={calc.inputs}
                outputs={calc.outputs}
                onChange={(report) => patch({ report })}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: live preview */}
        <div className="border rounded-xl p-5 overflow-y-auto bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Live Preview
          </p>
          {calc.inputs.length === 0 && calc.outputs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add inputs and outputs to see the live preview.
            </p>
          ) : (
            <CalculatorRenderer definition={calc} />
          )}
        </div>
      </div>
    </div>
  );
}
