import PurchaseOrdersScreen from "@/screens/purchase-orders/PurchaseOrdersScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase Orders | VendorBridge",
};

export default function Page() {
  return <PurchaseOrdersScreen />;
}
