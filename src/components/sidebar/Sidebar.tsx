"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { usePathname } from "next/navigation";
import { AuthService } from "@/api_service/auth";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ReceiptText, 
  CheckSquare, 
  ShoppingCart, 
  FileSpreadsheet, 
  BarChart2, 
  Activity, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCircle
} from "lucide-react";

const ADMIN_PROCUREMENT_MENU = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Vendors", path: "/vendors", icon: Users },
  { name: "RFQs", path: "/rfqs", icon: FileText },
  { name: "Quotation", path: "/quotation", icon: ReceiptText },
  { name: "Approval", path: "/approvals", icon: CheckSquare },
  { name: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart },
  { name: "Invoices", path: "/invoices", icon: FileSpreadsheet },
  { name: "Reports", path: "/reports", icon: BarChart2 },
  { name: "Activity", path: "/activity", icon: Activity },
];

const MANAGEMENT_MENU = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Vendors", path: "/vendors", icon: Users },
  { name: "Quotation", path: "/quotation", icon: ReceiptText },
  { name: "Approvals", path: "/approvals", icon: CheckSquare },
  { name: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart },
  { name: "Invoices", path: "/invoices", icon: FileSpreadsheet },
];

const VENDOR_MENU = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Invitations", path: "/invitations", icon: FileText },
  { name: "Quotations", path: "/quotation", icon: ReceiptText },
  { name: "PO & Invoices", path: "/vendor-orders", icon: ShoppingCart },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ text: string; top: number } | null>(null);
  const [identity, setIdentity] = useState({
    userRole: "Admin",
    userEmail: "admin@vendorbridge.com",
    portalName: "Admin Portal",
  });
  
  const pathname = usePathname();

  useEffect(() => {
    const token = Cookies.get("access_token");
    const nextIdentity = {
      userRole: "Admin",
      userEmail: "admin@vendorbridge.com",
      portalName: "Admin Portal",
    };
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(window.atob(base64));
        
        if (payload.email) nextIdentity.userEmail = payload.email;
        
        if (payload.role) {
          switch (payload.role.toLowerCase()) {
            case "procurement_officer":
              nextIdentity.userRole = "Procurement Officer";
              nextIdentity.portalName = "Procurement Portal";
              break;
            case "manager":
              nextIdentity.userRole = "Manager";
              nextIdentity.portalName = "Manager Portal";
              break;
            case "vendor":
              nextIdentity.userRole = "Vendor";
              nextIdentity.portalName = "Vendor Portal";
              break;
            case "admin":
            default:
              nextIdentity.userRole = "Admin";
              nextIdentity.portalName = "Admin Portal";
              break;
          }
        }
      } catch(e) {
        console.error("Failed to decode token", e);
      }
    }
    window.setTimeout(() => setIdentity(nextIdentity), 0);
  }, []);

  const { userRole, userEmail, portalName } = identity;

  const handleMouseEnter = (e: React.MouseEvent, text: string) => {
    if (isCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({ text, top: rect.top + rect.height / 2 });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  return (
    <>
      <aside 
        className={`relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            setHoveredTooltip(null);
          }}
          className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-gray-500 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Header / Logo */}
        <div className="flex flex-col items-center justify-center h-20 border-b border-gray-200 px-4">
          {isCollapsed ? (
            <div className="w-10 h-10 bg-green-500 text-white rounded-lg flex items-center justify-center font-bold text-xl">
              V
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <h1 className="text-2xl font-bold text-green-700 w-full text-center tracking-tight">
                VendorBridge
              </h1>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">
                {portalName}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <nav className="flex flex-col gap-1 px-3">
            {(userRole === "Vendor" ? VENDOR_MENU : (userRole === "Admin" || userRole === "Procurement Officer") ? ADMIN_PROCUREMENT_MENU : MANAGEMENT_MENU).map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onMouseEnter={(e) => handleMouseEnter(e, item.name)}
                  onMouseLeave={handleMouseLeave}
                  className={`flex items-center rounded-lg transition-colors p-2.5 ${
                    isActive 
                      ? "bg-green-50 text-green-700 font-medium" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  } ${isCollapsed ? "justify-center" : "justify-start"}`}
                >
                  <item.icon size={20} className={isActive ? "text-green-600" : "text-gray-500"} />
                  
                  {!isCollapsed && (
                    <span className="ml-3 text-sm">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Account */}
        <div className="border-t border-gray-200 p-3">
          {/* Account Info (Only if not collapsed) */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <UserCircle className="text-gray-400" size={32} />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-gray-900 truncate">{userRole}</span>
                <span className="text-xs text-gray-500 truncate">{userEmail}</span>
              </div>
            </div>
          )}
          
          {/* Logout Button */}
          <button
            onClick={() => AuthService.logout()}
            onMouseEnter={(e) => handleMouseEnter(e, "Logout")}
            onMouseLeave={handleMouseLeave}
            className={`flex items-center rounded-lg transition-colors p-2.5 text-red-600 hover:bg-red-50 w-full ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            <LogOut size={20} />
            {!isCollapsed && (
              <span className="ml-3 text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Floating Tooltip outside of overflow constraints */}
      {hoveredTooltip && (
        <div 
          className="fixed left-20 ml-3 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded shadow-md z-50 pointer-events-none"
          style={{ top: `${hoveredTooltip.top}px`, transform: 'translateY(-50%)' }}
        >
          {hoveredTooltip.text}
        </div>
      )}
    </>
  );
}
