"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuotationService } from "@/api_service/quotation";
import { RFQ } from "@/api_service/rfq";
import { ArrowLeft, Loader2, Calendar, FileText, Package, AlertCircle, ExternalLink, PenTool } from "lucide-react";

export default function VendorRFQDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        const data = await QuotationService.getVendorRFQ(parseInt(id, 10));
        setRfq(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load RFQ details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRFQ();
  }, [id]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== "number") return "-";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-8 w-full max-w-7xl mx-auto">
        <div className="mb-8 rounded-xl bg-red-50 p-4 border border-red-200 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-1 text-sm text-red-700">{error || "RFQ not found"}</div>
          </div>
        </div>
        <button onClick={() => router.back()} className="text-green-600 font-medium hover:underline">
          &larr; Back to Invitations
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/invitations")}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{rfq.title}</h1>
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-md">
                {rfq.rfq_number}
              </span>
            </div>
            <p className="mt-1 text-gray-500">Review requirements and submit your quotation.</p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/quotation/create/${rfq.id}`)}
          className="inline-flex items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        >
          <PenTool className="h-4 w-4 mr-2" />
          Create Quotation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Description</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap">{rfq.description || "No description provided."}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-gray-400" />
                Requested Items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price Required</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rfq.items?.map((item) => {
                    const estimatedTotal = typeof item.estimated_unit_price === "number" ? item.quantity * item.estimated_unit_price : undefined;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.item_name}
                          {item.part_number && <span className="ml-2 text-gray-500 text-xs">({item.part_number})</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 min-w-64">{item.description || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.estimated_unit_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">{formatCurrency(estimatedTotal)}</td>
                      </tr>
                    );
                  })}
                  {(!rfq.items || rfq.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                        No items found for this RFQ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Important Dates</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Submission Deadline</p>
                <div className="flex items-center text-gray-900 font-medium">
                  <Calendar className="h-5 w-5 mr-2 text-red-500" />
                  {formatDate(rfq.submission_deadline)}
                </div>
              </div>
              {rfq.delivery_deadline && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Expected Delivery Date</p>
                  <div className="flex items-center text-gray-900 font-medium">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    {formatDate(rfq.delivery_deadline)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-400" />
                Attachments
              </h2>
            </div>
            <div className="p-6">
              {rfq.attachments && rfq.attachments.length > 0 ? (
                <ul className="space-y-3">
                  {rfq.attachments.map((att) => (
                    <li key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center overflow-hidden">
                        <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">{att.file_name}</span>
                      </div>
                      <a
                        href={`http://localhost:8080${att.file_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-4 p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-green-600 rounded-md shadow-sm transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No attachments provided.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
