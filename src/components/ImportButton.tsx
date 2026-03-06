"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Support full library export format or bare array/object
      const payload =
        json.calculators ?? (Array.isArray(json) ? json : json);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.saved?.length > 0) {
        toast.success(`Imported ${result.saved.length} calculator${result.saved.length !== 1 ? "s" : ""}.`);
        router.refresh();
      }

      if (result.errors?.length > 0) {
        result.errors.forEach((err: { index: number; id?: string; errors: string[] }) => {
          toast.error(
            `Item ${err.index + 1}${err.id ? ` (${err.id})` : ""}: ${err.errors[0]}`
          );
        });
      }
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : "Invalid file"}`);
    } finally {
      setLoading(false);
      // Reset so same file can be re-imported
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? "Importing…" : "Import JSON"}
      </Button>
    </>
  );
}
