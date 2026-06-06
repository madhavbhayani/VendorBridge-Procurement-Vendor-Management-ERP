"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quotation, QuotationItem, QuotationService } from "@/api_service/quotation";
import { AlertCircle, FileText, Loader2 } from "lucide-react";

export default function SubmittedQuotationsScreen() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const data = await QuotationService.getVendorQuotations();
        setQuotations(data.quotations || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load submitted quotations");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotations();
  }, []);

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  };

  const getTaxAmount = (item: QuotationItem) => {
    return (item.tax_rates || []).reduce((sum, tax) => sum + (item.line_total * tax.rate / 100), 0);
  };

  const getQuotationTotal = (quotation: Quotation) => {
    return (quotation.items || []).reduce((sum, item) => sum + item.line_total + getTaxAmount(item), 0);
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Submitted Quotations</h1>
        <p className="mt-1 text-gray-500">Review quotations you have already submitted.</p>
      </div>

      {error && (
        <div className="mb-8 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-1 text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {quotations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No quotations submitted</h3>
          <p className="mt-2 text-gray-500">Submitted quotations will appear here after you respond to an RFQ.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quotation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFQ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {quotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/invitations/${quotation.rfq_id}`)}>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{quotation.quotation_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-medium text-gray-900">{quotation.rfq_title || `RFQ #${quotation.rfq_id}`}</div>
                      {quotation.rfq_number && <div className="text-xs text-gray-500">{quotation.rfq_number}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(quotation.submitted_at)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{quotation.items?.length || 0}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(getQuotationTotal(quotation), quotation.currency)}
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
