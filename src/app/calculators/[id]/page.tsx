import { getCalculator } from "@/lib/storage";
import { CalculatorRenderer } from "@/components/CalculatorRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export default async function CalculatorPage({ params }: Props) {
  const { id } = await params;
  const calc = getCalculator(id);
  if (!calc) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Library
        </Link>
        <h1 className="text-2xl font-bold mt-2">{calc.name}</h1>
        {calc.description && (
          <p className="text-muted-foreground mt-1 text-sm">{calc.description}</p>
        )}
        <div className="flex gap-2 mt-3">
          <Badge variant="outline">{calc.status}</Badge>
          <Badge variant="outline">{calc.complexity}</Badge>
          {calc.category && <Badge variant="outline">{calc.category}</Badge>}
        </div>
      </div>

      <CalculatorRenderer definition={calc} />

      <div className="mt-8 flex gap-3 flex-wrap">
        <Button variant="outline" asChild>
          <Link href={`/calculators/${id}/edit`}>Edit</Link>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/calculators/${id}/export`} download={`${id}.html`}>
            Export HTML
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/calculators/${id}`} download={`${id}.json`}>
            Export JSON
          </a>
        </Button>
      </div>
    </div>
  );
}
