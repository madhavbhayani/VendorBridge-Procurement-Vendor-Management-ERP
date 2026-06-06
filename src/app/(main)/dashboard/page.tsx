import DashboardScreen from "@/screens/dashboard/DashboardScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | VendorBridge",
};

export default function Page() {
  return <DashboardScreen />;
}
