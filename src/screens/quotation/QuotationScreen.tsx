"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/api_service/auth";
import { Quotation, QuotationService } from "@/api_service/quotation";
import SubmittedQuotationsScreen from "@/screens/vendor_portal/SubmittedQuotationsScreen";
import { AlertCircle, BadgeCheck, Loader2, ReceiptText } from "lucide-react";

export default function QuotationScreen() {
  const router = useRouter();
  const [role] = useState<string | null>(() => AuthService.getCurrentRole());
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role === "vendor") {
      setIsLoading(false);
      return;
    }

    const fetchQuotations = async () => {
      try {
        const data = await QuotationService.getAllQuotations();
        setQuotations(data.quotations || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load quotations");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotations();
  }, [role]);

  const groupedQuotations = useMemo(() => {
    return quotations.reduce<Record<number, Quotation[]>>((groups, quotation) => {
      groups[quotation.rfq_id] = groups[quotation.rfq_id] || [];
      groups[quotation.rfq_id].push(quotation);
      return groups;
    }, {});
  }, [quotations]);

  const formatCurrency = (value?: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value || 0);
  };

  if (role === "vendor") {
    return <SubmittedQuotationsScreen />;
  }

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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quotation Comparison</h1>
        <p className="mt-1 text-gray-500">Compare vendor submissions and move selected quotations to approval.</p>
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
          <ReceiptText className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No quotations submitted</h3>
          <p className="mt-2 text-gray-500">Vendor quotations will appear here once RFQs receive responses.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedQuotations).map(([rfqID, rfqQuotations]) => (
            <div key={rfqID} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">{rfqQuotations[0]?.rfq_title || `RFQ #${rfqID}`}</h2>
                <p className="text-sm text-gray-500">{rfqQuotations[0]?.rfq_number}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quotation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rfqQuotations.map((quotation) => (
                      <tr key={quotation.id} onClick={() => router.push(`/quotation/${quotation.id}`)} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {quotation.vendor_name || `Vendor #${quotation.vendor_id}`}
                            {quotation.is_recommended && (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                                <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                                Recommended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{quotation.quotation_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{quotation.status}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{quotation.items?.length || 0}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(quotation.total_amount, quotation.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
