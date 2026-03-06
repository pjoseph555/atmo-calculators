import { NextResponse } from "next/server";
import { parseImport } from "@/lib/schema-validator";
import { saveCalculator, getCalculator } from "@/lib/storage";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { calculators, errors } = parseImport(body);

  const saved: string[] = [];
  const skipped: string[] = [];

  for (const calc of calculators) {
    const existing = getCalculator(calc.id);
    if (existing) {
      // Bump version on overwrite
      calc.version = existing.version + 1;
    }
    saveCalculator(calc);
    saved.push(calc.id);
  }

  return NextResponse.json(
    {
      saved,
      skipped,
      errors,
      summary: `${saved.length} saved, ${errors.length} failed`,
    },
    { status: errors.length > 0 && saved.length === 0 ? 400 : 200 }
  );
}
