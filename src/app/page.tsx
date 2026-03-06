import { listCalculators } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import type { CalcComplexity, CalcStatus } from "@/types/calculator";

const statusColor: Record<CalcStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  deprecated: "bg-gray-100 text-gray-500",
};

const complexityColor: Record<CalcComplexity, string> = {
  simple: "bg-blue-100 text-blue-700",
  moderate: "bg-orange-100 text-orange-700",
  complex: "bg-red-100 text-red-700",
};

export default function HomePage() {
  const calculators = listCalculators().sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calculator Library</h1>
          <p className="text-muted-foreground mt-1">
            {calculators.length} calculator{calculators.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/calculators/new">+ New Calculator</Link>
        </Button>
      </div>

      {calculators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No calculators yet</p>
            <p className="mt-1 text-sm">Create your first calculator to get started.</p>
            <Button asChild className="mt-4">
              <Link href="/calculators/new">Create Calculator</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {calculators.map((calc) => (
            <Link key={calc.id} href={`/calculators/${calc.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{calc.name}</CardTitle>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[calc.status]}`}>
                      {calc.status}
                    </span>
                  </div>
                  {calc.description && (
                    <CardDescription className="text-sm line-clamp-2">
                      {calc.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${complexityColor[calc.complexity]}`}>
                      {calc.complexity}
                    </span>
                    {calc.category && (
                      <Badge variant="outline" className="text-xs">{calc.category}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {calc.inputs.length} input{calc.inputs.length !== 1 ? "s" : ""} ·{" "}
                    {calc.outputs.length} output{calc.outputs.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
