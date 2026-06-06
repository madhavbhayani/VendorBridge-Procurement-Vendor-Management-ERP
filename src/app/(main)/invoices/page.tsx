import InvoicesScreen from "@/screens/invoices/InvoicesScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices | VendorBridge",
};

export default function Page() {
  return <InvoicesScreen />;
}
