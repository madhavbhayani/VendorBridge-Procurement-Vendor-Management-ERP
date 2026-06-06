import InvitationsScreen from "@/screens/vendor_portal/InvitationsScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invitations | VendorBridge",
  description: "View RFQ invitations",
};

export default function InvitationsPage() {
  return <InvitationsScreen />;
}
