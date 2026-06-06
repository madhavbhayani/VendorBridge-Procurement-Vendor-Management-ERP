import VendorOrdersScreen from "@/screens/vendor_portal/VendorOrdersScreen";

export const metadata = {
  title: "Vendor Purchase Orders",
  description: "List of purchase orders for the logged‑in vendor",
};

export default function VendorOrdersPage() {
  return <VendorOrdersScreen />;
}
