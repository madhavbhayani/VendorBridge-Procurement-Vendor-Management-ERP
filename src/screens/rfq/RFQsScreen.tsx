"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RFQService, RFQSearchResult, RFQ } from "@/api_service/rfq";
import { useDebounce } from "@/hooks/useDebounce";
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  FileText
} from "lucide-react";

export default function RFQsScreen() {
  const router = useRouter();
  
  const [data, setData] = useState<RFQSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const fetchRFQs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await RFQService.searchRFQs(
          debouncedSearch, 
          selectedStatus || undefined, 
          page, 
          limit
        );
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load RFQs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRFQs();
  }, [debouncedSearch, selectedStatus, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedStatus]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = data ? data.total_pages : 0;

  return (
    <div className="p-6 md:p-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Request for Quotation</h1>
          <p className="mt-2 text-gray-500">Manage all your RFQs and invite vendors to bid.</p>
        </div>
        <button
          onClick={() => router.push('/rfqs/create')}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Create RFQ
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="Search by Title or RFQ Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-4 sm:w-auto w-full">
          <div className="relative flex-1 sm:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 appearance-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          {(searchQuery || selectedStatus) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("");
              }}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-red-800">Error Loading RFQs</h3>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            {isLoading && !data ? (
              <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : !data?.rfqs || data.rfqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] px-4 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No RFQs found</h3>
                <p className="mt-1 text-gray-500">
                  {searchQuery || selectedStatus 
                    ? "Try adjusting your search or filters." 
                    : "Get started by creating a new Request for Quotation."}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      RFQ Details
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="relative px-6 py-4">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(data?.rfqs || []).map((rfq) => (
                    <tr 
                      key={rfq.id} 
                      onClick={() => router.push(`/rfqs/${rfq.id}`)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors relative"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900 max-w-xs truncate" title={rfq.title}>{rfq.title}</div>
                            <div className="text-sm text-gray-500">{rfq.rfq_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(rfq.submission_deadline).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(rfq.status)}`}>
                          {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {data && data.rfqs && data.rfqs.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(page * limit, data.total)}</span> of{" "}
                    <span className="font-medium">{data.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <div className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                      Page {page} of {totalPages}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
