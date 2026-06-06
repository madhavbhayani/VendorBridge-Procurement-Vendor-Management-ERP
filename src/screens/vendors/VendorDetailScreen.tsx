"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  VendorService, 
  Vendor, 
  VendorCategory 
} from "@/api_service/vendor";
import { 
  Building2, 
  MapPin, 
  Landmark, 
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Globe
} from "lucide-react";

export default function VendorDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const vendorId = parseInt(params.id as string);
  
  const [vendor, setVendor] = useState<(Vendor & { categories: VendorCategory[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this vendor? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        await VendorService.deleteVendor(vendorId);
        router.push('/vendors');
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to delete vendor");
        setIsDeleting(false);
      }
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await VendorService.getVendor(vendorId);
        setVendor(data);
      } catch (err: any) {
        setError(err.message || "Failed to load vendor details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [vendorId]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'blacklisted':
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="p-6 md:p-8 w-full">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h2 className="text-lg font-semibold text-red-800">Error Loading Vendor</h2>
          <p className="mt-2 text-red-600">{error || "Vendor not found"}</p>
          <button onClick={() => router.back()} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm border border-red-200 hover:bg-red-50">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{vendor.company_name}</h1>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(vendor.status)}`}>
                {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
              </span>
            </div>
            {vendor.trade_name && <p className="mt-1 text-gray-500">Trading as: {vendor.trade_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="-ml-1 mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="-ml-1 mr-2 h-4 w-4" />}
            Delete
          </button>
          <button 
            onClick={() => router.push(`/vendors/${vendorId}/edit`)}
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Edit className="-ml-1 mr-2 h-4 w-4" />
            Edit Vendor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic Info & Categories */}
        <div className="lg:col-span-1 space-y-8">
          {/* Quick Contact */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <a href={`mailto:${vendor.email}`} className="hover:text-green-600 transition-colors">{vendor.email}</a>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <a href={`tel:${vendor.phone}`} className="hover:text-green-600 transition-colors">{vendor.phone}</a>
              </div>
              {vendor.alternate_phone && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-500 text-xs">Alt: </span>
                  <a href={`tel:${vendor.alternate_phone}`} className="hover:text-green-600 transition-colors">{vendor.alternate_phone}</a>
                </div>
              )}
              {vendor.website && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                  <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">
                    {vendor.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Tax Info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Tax & Registration</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">GST Number</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{vendor.gst_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">PAN Number</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{vendor.pan_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {vendor.categories && vendor.categories.length > 0 ? (
                vendor.categories.map(c => (
                  <span key={c.id} className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    {c.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No categories assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Addresses & Bank Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Notes */}
          {vendor.notes && (
            <div className="bg-yellow-50 rounded-2xl border border-yellow-100 p-6">
              <h3 className="text-sm font-semibold text-yellow-800 uppercase tracking-wider mb-2">Internal Notes</h3>
              <p className="text-sm text-yellow-700 whitespace-pre-wrap">{vendor.notes}</p>
            </div>
          )}

          {/* Addresses */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Addresses</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {vendor.addresses && vendor.addresses.length > 0 ? (
                vendor.addresses.map((addr) => (
                  <div key={addr.id} className="p-6">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 mb-3 uppercase tracking-wider">
                      {addr.address_type} Address
                    </span>
                    <p className="text-gray-900 font-medium">{addr.address_line1}</p>
                    {addr.address_line2 && <p className="text-gray-600 text-sm mt-1">{addr.address_line2}</p>}
                    <p className="text-gray-600 text-sm mt-1">
                      {addr.city}, {addr.state_name || ''} {addr.pincode}
                    </p>
                    {addr.country_name && <p className="text-gray-500 text-sm mt-1">{addr.country_name}</p>}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">No addresses registered.</div>
              )}
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 flex items-center gap-3">
              <Landmark className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {vendor.bank_details && vendor.bank_details.length > 0 ? (
                vendor.bank_details.map((bank) => (
                  <div key={bank.id} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{bank.bank_name}</span>
                      {bank.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                          <CheckCircle2 className="h-3 w-3" /> Primary Account
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Account Holder</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{bank.account_holder_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Account Number</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 font-mono">{bank.account_number}</p>
                    </div>
                    {bank.ifsc_code && (
                      <div>
                        <p className="text-xs text-gray-500">IFSC / Routing Code</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5 font-mono">{bank.ifsc_code}</p>
                      </div>
                    )}
                    {bank.swift_code && (
                      <div>
                        <p className="text-xs text-gray-500">SWIFT Code</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5 font-mono">{bank.swift_code}</p>
                      </div>
                    )}
                    {bank.branch_name && (
                      <div>
                        <p className="text-xs text-gray-500">Branch Name</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{bank.branch_name}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">No bank accounts registered.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
