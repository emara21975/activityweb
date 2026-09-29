import { redirect } from "next/navigation";

interface ReportsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const sParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sParams)) {
    if (value && key !== "tab") {
      params.set(key, value);
    }
  }
  const query = params.toString();
  redirect(`/reports/stat${query ? `?${query}` : ""}`);
}
