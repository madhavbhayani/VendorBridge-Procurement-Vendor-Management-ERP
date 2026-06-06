import RfqScreen from "@/screens/rfq/RfqScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rfq | VendorBridge",
};

export default function Page() {
  return <RfqScreen />;
}
