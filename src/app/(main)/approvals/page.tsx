import ApprovalsScreen from "@/screens/approvals/ApprovalsScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approvals | VendorBridge",
};

export default function Page() {
  return <ApprovalsScreen />;
}
