"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/api_service/auth";
import { ApprovalRequest, QuotationItem, QuotationService } from "@/api_service/quotation";
import { AlertCircle, CheckCircle, Loader2, XCircle, FileText } from "lucide-react";

export default function ApprovalsScreen() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = AuthService.getCurrentRole();
  const canDecide = role === "manager" || role === "admin";

  const fetchApprovals = async () => {
    try {
      const data = await QuotationService.getApprovals();
      setApprovals(data.approvals || []);
      setSelectedApproval(data.approvals?.[0] || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const formatCurrency = (value?: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value || 0);
  };

  const taxAmount = (item: QuotationItem) => {
    return (item.tax_rates || []).reduce((sum, tax) => sum + item.line_total * tax.rate / 100, 0);
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!selectedApproval) return;
    setIsSubmitting(true);
    try {
      await QuotationService.decideApproval(selectedApproval.id, status);
      await fetchApprovals();
      if (status === "approved") {
        router.push("/purchase-orders");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update approval");
    } finally {
      setIsSubmitting(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Approvals</h1>
        <p className="mt-1 text-gray-500">Review quotation approval requests raised by Procurement Officers.</p>
      </div>

      {error && (
        <div className="mb-8 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No approval requests</h3>
          <p className="mt-2 text-gray-500">Pending quotation approvals will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {approvals.map((approval) => (
                <button
                  key={approval.id}
                  onClick={() => setSelectedApproval(approval)}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${selectedApproval?.id === approval.id ? "bg-green-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-gray-900">{approval.quotation?.quotation_number}</div>
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{approval.status}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{approval.quotation?.vendor_name}</div>
                  <div className="mt-1 text-xs text-gray-500">Requested by {approval.requested_by_name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {selectedApproval && selectedApproval.quotation && (
              <>
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedApproval.quotation.quotation_number}</h2>
                    <p className="text-sm text-gray-500">{selectedApproval.quotation.rfq_title} / {selectedApproval.quotation.vendor_name}</p>
                  </div>
                  {canDecide && (
                    <div className="flex gap-3">
                      <button disabled={isSubmitting || selectedApproval.status !== "pending"} onClick={() => decide("rejected")} className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </button>
                      <button disabled={isSubmitting || selectedApproval.status !== "pending"} onClick={() => decide("approved")} className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-gray-100 bg-gray-50">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Vendor Notes</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedApproval.quotation.notes || "No notes provided."}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Payment Terms</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedApproval.quotation.payment_terms || "Not specified."}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Delivery</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedApproval.quotation.delivery_days} days</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Validity</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedApproval.quotation.validity_days} days</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxes</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedApproval.quotation.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                          <td className="px-6 py-4 text-sm text-right">{item.quantity}</td>
                          <td className="px-6 py-4 text-sm text-right">{formatCurrency(item.unit_price, selectedApproval.quotation?.currency)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.tax_rates?.map((tax) => tax.name).join(", ") || "No tax"}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(item.line_total + taxAmount(item), selectedApproval.quotation?.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-right text-base font-bold text-gray-900">Grand Total</td>
                        <td className="px-6 py-4 text-right text-lg font-bold text-green-700">{formatCurrency(selectedApproval.quotation.total_amount, selectedApproval.quotation.currency)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
