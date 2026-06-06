import QuotationScreen from "@/screens/quotation/QuotationScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quotation | VendorBridge",
};

export default function Page() {
  return <QuotationScreen />;
}
