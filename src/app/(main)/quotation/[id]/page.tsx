import QuotationDetailScreen from "@/screens/quotation/QuotationDetailScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quotation Details | VendorBridge",
};

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <QuotationDetailScreen id={resolvedParams.id} />;
}
