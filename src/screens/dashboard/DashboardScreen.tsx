"use client";

import { useEffect, useState } from "react";
import { ApiClient } from "@/api_service/client";
import { 
  FileText, 
  CheckSquare, 
  ShoppingCart, 
  AlertCircle,
  Loader2
} from "lucide-react";

interface RecentPO {
  id: number;
  po_number: string;
  vendor_name: string;
  amount: number;
  status: string;
}

interface DashboardData {
  active_rfqs: number;
  pending_approvals: number;
  purchase_orders_this_month: number;
  overdue_invoices: number;
  recent_purchase_orders: RecentPO[];
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await ApiClient.get<DashboardData>("/api/dashboard");
        setData(response);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-green-600" />
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h2 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h2>
          <p className="mt-2 text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm border border-red-200 hover:bg-red-50 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="p-6 md:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard overview</h1>
        <p className="mt-2 text-gray-500">Monitor your procurement operations and recent activities.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-green-100 group">
          <div className="flex items-center">
            <div className="rounded-xl bg-green-50 p-3 group-hover:bg-green-100 transition-colors">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active RFQs</p>
              <h3 className="text-2xl font-bold text-gray-900">{data.active_rfqs}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-yellow-100 group">
          <div className="flex items-center">
            <div className="rounded-xl bg-yellow-50 p-3 group-hover:bg-yellow-100 transition-colors">
              <CheckSquare className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-gray-900">{data.pending_approvals}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-100 group">
          <div className="flex items-center">
            <div className="rounded-xl bg-blue-50 p-3 group-hover:bg-blue-100 transition-colors">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">POs This Month</p>
              <h3 className="text-2xl font-bold text-gray-900">{data.purchase_orders_this_month}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-red-100 group">
          <div className="flex items-center">
            <div className="rounded-xl bg-red-50 p-3 group-hover:bg-red-100 transition-colors">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue Invoices</p>
              <h3 className="text-2xl font-bold text-gray-900">{data.overdue_invoices}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Recent Purchase Orders</h2>
        </div>
        
        <div className="overflow-x-auto">
          {data.recent_purchase_orders && data.recent_purchase_orders.length > 0 ? (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">PO Number</th>
                  <th scope="col" className="px-6 py-4 font-medium">Vendor</th>
                  <th scope="col" className="px-6 py-4 font-medium">Amount</th>
                  <th scope="col" className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recent_purchase_orders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {po.po_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {po.vendor_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-900 font-medium">
                      {formatCurrency(po.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(po.status)}`}>
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No recent purchase orders</h3>
              <p className="mt-1 text-gray-500">Purchase orders created recently will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
