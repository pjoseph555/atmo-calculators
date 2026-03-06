import { NextResponse } from "next/server";
import { listCalculators } from "@/lib/storage";

/** Export the full calculator library as a JSON file. */
export async function GET() {
  const calculators = listCalculators();
  const payload = {
    schemaVersion: "1.0",
    exportedAt: new Date().toISOString(),
    count: calculators.length,
    calculators,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="atmo-calculators-export.json"',
    },
  });
}
