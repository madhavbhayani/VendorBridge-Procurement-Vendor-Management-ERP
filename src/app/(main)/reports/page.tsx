import ReportsScreen from "@/screens/reports/ReportsScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports | VendorBridge",
};

export default function Page() {
  return <ReportsScreen />;
}
