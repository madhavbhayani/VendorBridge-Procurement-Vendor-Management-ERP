import ActivityScreen from "@/screens/activity/ActivityScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity | VendorBridge",
};

export default function Page() {
  return <ActivityScreen />;
}
