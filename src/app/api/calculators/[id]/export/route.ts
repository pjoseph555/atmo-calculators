import { NextResponse } from "next/server";
import { getCalculator } from "@/lib/storage";
import { generateHtml } from "@/lib/export-html";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const calc = getCalculator(id);
  if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const html = generateHtml(calc);
  const filename = `${id}.html`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
