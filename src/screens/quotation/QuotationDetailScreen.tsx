"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quotation, QuotationItem, QuotationService } from "@/api_service/quotation";
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, XCircle } from "lucide-react";

export default function QuotationDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const data = await QuotationService.getQuotation(Number(id));
        setQuotation(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load quotation");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotation();
  }, [id]);

  const formatCurrency = (value?: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value || 0);
  };

  const taxAmount = (item: QuotationItem) => {
    return (item.tax_rates || []).reduce((sum, tax) => sum + item.line_total * tax.rate / 100, 0);
  };

  const handleRequestApproval = async () => {
    if (!quotation) return;
    setIsSubmitting(true);
    try {
      await QuotationService.requestApproval(quotation.id);
      router.push("/quotation");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request approval");
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!quotation) return;
    setIsSubmitting(true);
    try {
      await QuotationService.rejectQuotation(quotation.id);
      router.push("/quotation");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject quotation");
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

  if (!quotation) return null;

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto pb-24">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/quotation")} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{quotation.quotation_number}</h1>
            <p className="mt-1 text-gray-500">{quotation.vendor_name} / {quotation.rfq_title}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button disabled={isSubmitting || quotation.status !== "submitted"} onClick={handleReject} className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </button>
          <button disabled={isSubmitting || quotation.status !== "submitted"} onClick={handleRequestApproval} className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Accept
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotation.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 min-w-64">{item.item_description || "-"}</td>
                  <td className="px-6 py-4 text-sm text-right">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-right">{formatCurrency(item.unit_price, quotation.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.tax_rates?.map((tax) => `${tax.name} (${tax.rate}%)`).join(", ") || "No tax"}</td>
                  <td className="px-6 py-4 text-sm text-right">{item.discount_pct}%</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(item.line_total + taxAmount(item), quotation.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={6} className="px-6 py-4 text-right text-base font-bold text-gray-900">Grand Total</td>
                <td className="px-6 py-4 text-right text-lg font-bold text-green-700">{formatCurrency(quotation.total_amount, quotation.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
