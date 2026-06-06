import SignUpScreen from "@/screens/auth/signup/SignUpScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | VendorBridge",
  description: "Create a new VendorBridge account",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-6">
      <SignUpScreen />
    </div>
  );
}
