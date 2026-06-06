"use client";

import { useEffect, useState } from "react";
import { PurchaseOrder, QuotationService } from "@/api_service/quotation";
import { AlertCircle, Download, Loader2 } from "lucide-react";

export default function VendorOrdersScreen() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await QuotationService.getPurchaseOrders();
        // Backend should filter PO list to only those belonging to the authenticated vendor
        setOrders(data.purchase_orders || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load purchase orders");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
        <span className="ml-2 text-gray-600">Loading purchase orders…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
        My Purchase Orders
      </h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No purchase orders available.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gradient-to-b from-gray-100 to-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-800">PO #</th>
              <th className="px-4 py-2 text-left font-medium text-gray-800">Vendor</th>
              <th className="px-4 py-2 text-left font-medium text-gray-800">RFQ Title</th>
              <th className="px-4 py-2 text-left font-medium text-gray-800">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-800">Total</th>
              <th className="px-4 py-2 text-left font-medium text-gray-800">Created At</th>
              <th className="px-4 py-2 text-center font-medium text-gray-800">Actions</th>
            </tr>
          </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-t bg-white even:bg-gray-50 hover:bg-gray-100 transition-colors">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{po.po_number}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{po.vendor_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{po.rfq_title}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      po.status === 'approved' ? 'bg-green-100 text-green-800' :
                      po.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>${po.status}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {(po.items?.reduce((sum, i) => sum + (i.line_total || 0), 0) ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{new Date(po.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-center space-x-3">
                    <a
                      href={`/api/purchase-orders/${po.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </a>
                    <a
                      href={`/vendor-orders/${po.id}`}
                      className="inline-flex items-center text-indigo-600 hover:underline"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
