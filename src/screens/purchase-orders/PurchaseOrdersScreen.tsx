"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { PurchaseOrder, QuotationService } from "@/api_service/quotation";
import { AlertCircle, Download, Loader2, ShoppingCart } from "lucide-react";

export default function PurchaseOrdersScreen() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await QuotationService.getPurchaseOrders();
        setOrders(data.purchase_orders || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load purchase orders");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatCurrency = (value: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  };

  const orderTotal = (order: PurchaseOrder) => {
    return (order.items || []).reduce((sum, item) => sum + item.line_total, 0);
  };

  const downloadPDF = async (order: PurchaseOrder) => {
    const token = Cookies.get("access_token");
    const response = await fetch(`/api/purchase-orders/${order.id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      setError("Failed to download purchase order PDF");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${order.po_number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
        <p className="mt-1 text-gray-500">Generated purchase orders from approved quotations.</p>
      </div>

      {error && (
        <div className="mb-8 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No purchase orders</h3>
          <p className="mt-2 text-gray-500">Approved quotations will generate draft purchase orders here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFQ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{order.po_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.vendor_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.rfq_title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.status}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(orderTotal(order), order.currency)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => downloadPDF(order)} className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
