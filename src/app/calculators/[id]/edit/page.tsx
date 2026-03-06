import { getCalculator } from "@/lib/storage";
import { CalcEditor } from "@/components/builder/CalcEditor";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function EditCalculatorPage({ params }: Props) {
  const { id } = await params;
  const calc = getCalculator(id);
  if (!calc) notFound();

  return <CalcEditor initial={calc} />;
}
