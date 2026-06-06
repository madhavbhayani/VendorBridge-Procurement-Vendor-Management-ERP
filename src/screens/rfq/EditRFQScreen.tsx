"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { RFQService, RFQItem, RFQ } from "@/api_service/rfq";
import { VendorService, VendorSummary } from "@/api_service/vendor";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Upload,
  Building2,
  X,
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react";

export default function EditRFQScreen() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available Vendors to invite
  const [availableVendors, setAvailableVendors] = useState<VendorSummary[]>([]);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  
  const [items, setItems] = useState<Partial<RFQItem>[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  
  // Existing Attachments
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  // New Files
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setError("Invalid RFQ ID");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [rfqRes, vendorRes] = await Promise.all([
          RFQService.getRFQ(Number(id)),
          VendorService.listVendors(1, 100)
        ]);
        
        setAvailableVendors(vendorRes.vendors);
        
        // Populate Form
        setTitle(rfqRes.title);
        setDescription(rfqRes.description || "");
        setStatus(rfqRes.status);
        
        // Convert dates to datetime-local format
        if (rfqRes.submission_deadline) {
          const sd = new Date(rfqRes.submission_deadline);
          sd.setMinutes(sd.getMinutes() - sd.getTimezoneOffset());
          setSubmissionDeadline(sd.toISOString().slice(0, 16));
        }
        if (rfqRes.delivery_deadline) {
          const dd = new Date(rfqRes.delivery_deadline);
          dd.setMinutes(dd.getMinutes() - dd.getTimezoneOffset());
          setDeliveryDeadline(dd.toISOString().slice(0, 16));
        }

        setItems(rfqRes.items || []);
        setSelectedVendors(rfqRes.invitations?.map(inv => inv.vendor_id) || []);
        setExistingAttachments(rfqRes.attachments || []);

      } catch (err: any) {
        setError(err.message || "Failed to load RFQ for editing");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAddItem = () => {
    setItems([
      ...items, 
      { item_name: "", quantity: 1, unit_id: 1, sort_order: items.length + 1 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof RFQItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const toggleVendor = (vendorId: number) => {
    if (selectedVendors.includes(vendorId)) {
      setSelectedVendors(selectedVendors.filter(vid => vid !== vendorId));
    } else {
      setSelectedVendors([...selectedVendors, vendorId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !submissionDeadline) {
      setError("Title and Submission Deadline are required.");
      return;
    }
    
    if (items.some(item => !item.item_name || !item.quantity)) {
      setError("All items must have a name and quantity.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        description,
        status,
        submission_deadline: new Date(submissionDeadline).toISOString(),
        delivery_deadline: deliveryDeadline ? new Date(deliveryDeadline).toISOString() : undefined,
        items,
        vendor_ids: selectedVendors
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));
      
      files.forEach((file) => {
        formData.append("attachments", file);
      });

      await RFQService.updateRFQ(Number(id), formData);
      router.push(`/rfqs/${id}`);
    } catch (err: any) {
      setError(err.message || "Failed to update RFQ");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Edit Request for Quotation</h1>
          <p className="mt-1 text-gray-500">Update RFQ details and add new attachments.</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-xl bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Basic Information</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm bg-white"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700">RFQ Title *</label>
              <input
                type="text"
                required
                className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={1}
                className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Submission Deadline *</label>
              <input
                type="datetime-local"
                required
                className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Expected Delivery Deadline</label>
              <input
                type="datetime-local"
                className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                value={deliveryDeadline}
                onChange={(e) => setDeliveryDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Side-by-Side: Line Items & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Line Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Line Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
                Add Item
              </button>
            </div>
            <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[600px]">
              {items.map((item, index) => (
                <div key={index} className="relative bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="absolute -top-3 -right-3 rounded-full bg-red-100 p-1.5 text-red-600 hover:bg-red-200 shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-medium text-gray-700">Item Name *</label>
                      <input
                        type="text"
                        required
                        value={item.item_name || ''}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-700">Quantity *</label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-700">Est. Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.estimated_unit_price || ''}
                        onChange={(e) => handleItemChange(index, 'estimated_unit_price', parseFloat(e.target.value))}
                        className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                    <div className="sm:col-span-12">
                      <label className="block text-xs font-medium text-gray-700">Specifications / Description</label>
                      <textarea
                        rows={2}
                        value={item.specifications || ''}
                        onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                        className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No line items added.</p>
              )}
            </div>
          </div>

          {/* Quotation Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Quotation Summary</h3>
            </div>
            <div className="p-6 flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Price</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const lineTotal = (item.quantity || 0) * (item.estimated_unit_price || 0);
                    return (
                      <tr key={index}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{item.item_name || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">{item.quantity}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">pcs</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                          {item.estimated_unit_price ? `₹${item.estimated_unit_price.toFixed(2)}` : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                          ₹{lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-sm font-bold text-gray-900 text-right border-t border-gray-200">Total Estimated Value</td>
                    <td className="px-3 py-4 text-sm font-bold text-blue-600 text-right border-t border-gray-200">
                      ₹{items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.estimated_unit_price || 0)), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Side-by-Side: Vendors & Attachments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vendors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Manage Vendor Invitations</h3>
            </div>
            <div className="p-6 flex-1 overflow-y-auto max-h-64 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableVendors.map((vendor) => (
                  <div 
                    key={vendor.id}
                    onClick={() => toggleVendor(vendor.id)}
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedVendors.includes(vendor.id) 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className={`h-5 w-5 mr-3 flex-shrink-0 ${selectedVendors.includes(vendor.id) ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedVendors.includes(vendor.id) ? 'text-blue-900' : 'text-gray-900'}`}>
                        {vendor.company_name}
                      </p>
                      <p className="text-xs text-gray-500">{vendor.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-500">Selected {selectedVendors.length} vendor(s).</p>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full mt-8 lg:mt-0">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Attachments</h3>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              {existingAttachments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Files</h4>
                  <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 max-h-32 overflow-y-auto">
                    {existingAttachments.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between py-3 pl-4 pr-5 text-sm leading-6 bg-gray-50">
                        <div className="flex w-0 flex-1 items-center">
                          <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />
                          <div className="ml-4 flex min-w-0 flex-1 gap-2">
                            <span className="truncate font-medium">{file.file_name}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Files</h4>
              <div className="flex justify-center rounded-xl border border-dashed border-gray-300 px-6 py-10 hover:border-blue-400 transition-colors bg-gray-50">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                    >
                      <span>Upload files</span>
                      <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                </div>
              </div>
              {files.length > 0 && (
                <ul className="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200 overflow-y-auto max-h-32">
                  {files.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between py-3 pl-4 pr-5 text-sm leading-6 bg-white">
                      <div className="flex w-0 flex-1 items-center">
                        <FileText className="h-5 w-5 flex-shrink-0 text-gray-400" />
                        <div className="ml-4 flex min-w-0 flex-1 gap-2">
                          <span className="truncate font-medium">{file.name}</span>
                          <span className="flex-shrink-0 text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-x-4 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
