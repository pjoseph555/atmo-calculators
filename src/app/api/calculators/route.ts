import { NextResponse } from "next/server";
import { listCalculators, createCalculator } from "@/lib/storage";
import type { CalculatorDefinition } from "@/types/calculator";

export async function GET() {
  const calculators = listCalculators();
  return NextResponse.json(calculators);
}

export async function POST(request: Request) {
  const body = await request.json();
  const calc = createCalculator(
    body as Omit<CalculatorDefinition, "createdAt" | "updatedAt" | "version">
  );
  return NextResponse.json(calc, { status: 201 });
}
