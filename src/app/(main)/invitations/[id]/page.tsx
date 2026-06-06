import VendorRFQDetailScreen from "@/screens/vendor_portal/VendorRFQDetailScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RFQ Details | VendorBridge",
  description: "View RFQ details and submit quotation",
};

export default async function VendorRFQDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <VendorRFQDetailScreen id={resolvedParams.id} />;
}
