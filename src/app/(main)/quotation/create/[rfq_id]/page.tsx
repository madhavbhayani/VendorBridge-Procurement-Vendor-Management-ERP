import CreateQuotationScreen from "@/screens/vendor_portal/CreateQuotationScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Quotation | VendorBridge",
  description: "Submit a quotation for an RFQ",
};

export default async function CreateQuotationPage({ params }: { params: Promise<{ rfq_id: string }> }) {
  const resolvedParams = await params;
  return <CreateQuotationScreen rfqId={resolvedParams.rfq_id} />;
}
