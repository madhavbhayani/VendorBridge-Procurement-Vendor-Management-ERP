"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RFQService, RFQ } from "@/api_service/rfq";
import { VendorService, VendorSummary } from "@/api_service/vendor";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  Download,
  Building2
} from "lucide-react";

export default function RFQDetailScreen() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [vendorMap, setVendorMap] = useState<Record<number, VendorSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setError("Invalid RFQ ID");
      setIsLoading(false);
      return;
    }

    const fetchRFQDetails = async () => {
      try {
        const data = await RFQService.getRFQ(Number(id));
        setRfq(data);

        // Fetch vendor names for the invitations
        if (data.invitations && data.invitations.length > 0) {
          // In a real app we'd fetch them by ID or have the backend return the vendor names.
          // For now, we'll fetch list and map them.
          const res = await VendorService.listVendors(1, 100);
          const map: Record<number, VendorSummary> = {};
          res.vendors.forEach(v => {
            map[v.id] = v;
          });
          setVendorMap(map);
        }

      } catch (err: any) {
        setError(err.message || "Failed to load RFQ details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRFQDetails();
  }, [id]);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this RFQ? This action cannot be undone.")) {
      try {
        await RFQService.deleteRFQ(Number(id));
        router.push("/rfqs");
      } catch (err: any) {
        alert(err.message || "Failed to delete RFQ");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-6 md:p-8 w-full">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-red-800">Error</h3>
          <p className="mt-2 text-red-600">{error || "RFQ not found"}</p>
          <button
            onClick={() => router.push('/rfqs')}
            className="mt-4 text-sm font-medium text-red-600 hover:text-red-500"
          >
            &larr; Back to RFQs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8 gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/rfqs')}
            className="mt-1 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{rfq.title}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(rfq.status)}`}>
                {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500 font-medium">RFQ Number: {rfq.rfq_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/rfqs/${rfq.id}/edit`)}
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Edit className="-ml-1 mr-2 h-4 w-4 text-gray-400" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100 transition-colors"
          >
            <Trash2 className="-ml-1 mr-2 h-4 w-4 text-red-600" />
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Overview Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Overview</h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{rfq.description || "No description provided."}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Submission Deadline
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {new Date(rfq.submission_deadline).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expected Delivery
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {rfq.delivery_deadline ? new Date(rfq.delivery_deadline).toLocaleString() : 'Not Specified'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Line Items</h3>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {rfq.items?.length || 0} Items
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rfq.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">{item.specifications || '-'}</td>
                  </tr>
                ))}
                {(!rfq.items || rfq.items.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No line items added.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invited Vendors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Invited Vendors</h3>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {rfq.invitations?.length || 0} Vendors
              </span>
            </div>
            <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
              {rfq.invitations?.map((inv) => {
                const v = vendorMap[inv.vendor_id];
                return (
                  <li key={inv.vendor_id} className="p-4 flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {v ? v.company_name : `Vendor ID: ${inv.vendor_id}`}
                      </p>
                      <p className="text-xs text-gray-500 truncate">Invited on {new Date(inv.invited_at).toLocaleDateString()}</p>
                    </div>
                  </li>
                );
              })}
              {(!rfq.invitations || rfq.invitations.length === 0) && (
                <li className="p-4 text-sm text-gray-500 text-center">No vendors invited.</li>
              )}
            </ul>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Attachments</h3>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {rfq.attachments?.length || 0} Files
              </span>
            </div>
            <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
              {rfq.attachments?.map((file) => (
                <li key={file.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0 space-x-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {file.file_size_bytes ? `${(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`http://localhost:8080${file.file_url}`} // Assuming backend is on 8080
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 flex-shrink-0 text-blue-600 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                </li>
              ))}
              {(!rfq.attachments || rfq.attachments.length === 0) && (
                <li className="p-4 text-sm text-gray-500 text-center">No attachments uploaded.</li>
              )}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
