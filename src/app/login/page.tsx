import LoginScreen from "@/screens/auth/login/LoginScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | VendorBridge",
  description: "Sign in to your VendorBridge account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-6">
      <LoginScreen />
    </div>
  );
}
