import { NextResponse } from "next/server";
import { getCalculator, saveCalculator, deleteCalculator } from "@/lib/storage";
import type { CalculatorDefinition } from "@/types/calculator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const calc = getCalculator(id);
  if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(calc);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = getCalculator(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as CalculatorDefinition;
  const updated: CalculatorDefinition = {
    ...existing,
    ...body,
    id,
    version: existing.version + 1,
    createdAt: existing.createdAt,
  };
  saveCalculator(updated);
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const deleted = deleteCalculator(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
