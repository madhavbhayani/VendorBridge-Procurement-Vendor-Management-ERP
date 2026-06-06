"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuotationService } from "@/api_service/quotation";
import { RFQ } from "@/api_service/rfq";
import { FileText, Loader2, Calendar, AlertCircle } from "lucide-react";

export default function InvitationsScreen() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const res = await QuotationService.getVendorInvitations();
        setInvitations(res.invitations || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load invitations");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvitations();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
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
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">RFQ Invitations</h1>
          <p className="mt-1 text-gray-500">View Requests for Quotations that you have been invited to participate in.</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-xl bg-red-50 p-4 border border-red-200 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-1 text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No invitations yet</h3>
          <p className="mt-2 text-gray-500">No RFQ invitations are available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invitations.map((rfq) => (
            <div
              key={rfq.id}
              onClick={() => router.push(`/invitations/${rfq.id}`)}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-green-300 transition-all flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                  {rfq.rfq_number}
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {rfq.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                {rfq.title}
              </h3>
              
              <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-grow">
                {rfq.description || "No description provided."}
              </p>

              <div className="pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Submit by: <span className="font-medium text-gray-900">{formatDate(rfq.submission_deadline)}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
