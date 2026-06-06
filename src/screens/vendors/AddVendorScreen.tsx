"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  VendorService, 
  Vendor, 
  VendorAddress, 
  VendorBankDetail, 
  VendorCategory 
} from "@/api_service/vendor";
import { 
  Building2, 
  MapPin, 
  Landmark, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle
} from "lucide-react";

const DUMMY_COUNTRIES = [
  { id: 1, name: "United States" },
  { id: 2, name: "India" },
  { id: 3, name: "United Kingdom" }
];

export default function AddVendorScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [basicInfo, setBasicInfo] = useState({
    company_name: "",
    trade_name: "",
    gst_number: "",
    pan_number: "",
    email: "",
    phone: "",
    alternate_phone: "",
    website: "",
    status: "pending",
    notes: ""
  });

  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const [addresses, setAddresses] = useState<VendorAddress[]>([{
    address_type: "billing",
    address_line1: "",
    address_line2: "",
    city: "",
    pincode: "",
    state_name: "",
    country_id: 1 // Default to US
  }]);

  const [banks, setBanks] = useState<VendorBankDetail[]>([{
    account_holder_name: "",
    account_number: "",
    bank_name: "",
    branch_name: "",
    ifsc_code: "",
    swift_code: "",
    is_primary: true
  }]);

  useEffect(() => {
    VendorService.getCategories().then(setCategories).catch(console.error);
  }, []);

  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBasicInfo(prev => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Address Handlers
  const addAddress = () => {
    setAddresses(prev => [...prev, {
      address_type: "shipping",
      address_line1: "",
      city: "",
      pincode: "",
      country_id: 1
    }]);
  };

  const removeAddress = (index: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== index));
  };

  const updateAddress = (index: number, field: keyof VendorAddress, value: any) => {
    setAddresses(prev => {
      const newAddrs = [...prev];
      newAddrs[index] = { ...newAddrs[index], [field]: value };
      return newAddrs;
    });
  };

  // Bank Handlers
  const addBank = () => {
    setBanks(prev => [...prev, {
      account_holder_name: "",
      account_number: "",
      bank_name: "",
      is_primary: prev.length === 0
    }]);
  };

  const removeBank = (index: number) => {
    setBanks(prev => {
      const newBanks = prev.filter((_, i) => i !== index);
      if (newBanks.length > 0 && !newBanks.some(b => b.is_primary)) {
        newBanks[0].is_primary = true;
      }
      return newBanks;
    });
  };

  const updateBank = (index: number, field: keyof VendorBankDetail, value: any) => {
    setBanks(prev => {
      const newBanks = [...prev];
      if (field === 'is_primary' && value === true) {
        newBanks.forEach(b => b.is_primary = false);
      }
      newBanks[index] = { ...newBanks[index], [field]: value };
      return newBanks;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Vendor = {
        ...basicInfo,
        category_ids: selectedCategories,
        addresses: addresses.map(a => ({
            ...a,
            country_id: Number(a.country_id)
        })),
        bank_details: banks
      };

      await VendorService.createVendor(payload);
      router.push('/vendors');
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create vendor");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Add New Vendor</h1>
          <p className="mt-1 text-gray-500">Register a new supplier in the system.</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Submission Failed</h3>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name *</label>
              <input required type="text" name="company_name" value={basicInfo.company_name} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Trade Name</label>
              <input type="text" name="trade_name" value={basicInfo.trade_name} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address *</label>
              <input required type="email" name="email" value={basicInfo.email} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Primary Phone *</label>
              <input required type="tel" name="phone" value={basicInfo.phone} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">GST Number</label>
              <input type="text" name="gst_number" value={basicInfo.gst_number} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">PAN Number</label>
              <input type="text" name="pan_number" value={basicInfo.pan_number} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select name="status" value={basicInfo.status} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm bg-white">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <input type="url" name="website" value={basicInfo.website} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea name="notes" rows={3} value={basicInfo.notes} onChange={handleBasicInfoChange} className="mt-2 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm" />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <p className="text-sm text-gray-500 mt-1">Select all categories that apply to this vendor.</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                    selectedCategories.includes(cat.id)
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && <span className="text-sm text-gray-500">Loading categories...</span>}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Addresses</h2>
            </div>
            <button type="button" onClick={addAddress} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
              <Plus className="h-4 w-4 mr-1" /> Add Address
            </button>
          </div>
          <div className="p-6 space-y-6">
            {addresses.map((addr, idx) => (
              <div key={idx} className="relative rounded-xl border border-gray-100 bg-gray-50 p-5">
                {addresses.length > 1 && (
                  <button type="button" onClick={() => removeAddress(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Address Type *</label>
                    <select required value={addr.address_type} onChange={(e) => updateAddress(idx, 'address_type', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm bg-white">
                      <option value="billing">Billing</option>
                      <option value="shipping">Shipping</option>
                      <option value="office">Office</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700">Address Line 1 *</label>
                    <input required type="text" value={addr.address_line1} onChange={(e) => updateAddress(idx, 'address_line1', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700">Address Line 2</label>
                    <input type="text" value={addr.address_line2 || ""} onChange={(e) => updateAddress(idx, 'address_line2', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">City *</label>
                    <input required type="text" value={addr.city} onChange={(e) => updateAddress(idx, 'city', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">State / Province</label>
                    <input type="text" value={addr.state_name || ""} onChange={(e) => updateAddress(idx, 'state_name', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Pincode/ZIP *</label>
                    <input required type="text" value={addr.pincode} onChange={(e) => updateAddress(idx, 'pincode', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Country *</label>
                    <select required value={addr.country_id} onChange={(e) => updateAddress(idx, 'country_id', parseInt(e.target.value))} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm bg-white">
                      {DUMMY_COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
            </div>
            <button type="button" onClick={addBank} className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center">
              <Plus className="h-4 w-4 mr-1" /> Add Bank
            </button>
          </div>
          <div className="p-6 space-y-6">
            {banks.map((bank, idx) => (
              <div key={idx} className="relative rounded-xl border border-gray-100 bg-gray-50 p-5">
                {banks.length > 1 && (
                  <button type="button" onClick={() => removeBank(idx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                
                <div className="mb-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={bank.is_primary} onChange={(e) => updateBank(idx, 'is_primary', e.target.checked)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-600 h-4 w-4" />
                    <span className="ml-2 text-sm font-medium text-gray-700">Primary Bank Account</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Bank Name *</label>
                    <input required type="text" value={bank.bank_name} onChange={(e) => updateBank(idx, 'bank_name', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Account Holder Name *</label>
                    <input required type="text" value={bank.account_holder_name} onChange={(e) => updateBank(idx, 'account_holder_name', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Account Number *</label>
                    <input required type="text" value={bank.account_number} onChange={(e) => updateBank(idx, 'account_number', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">IFSC / Routing Code</label>
                    <input type="text" value={bank.ifsc_code || ""} onChange={(e) => updateBank(idx, 'ifsc_code', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">SWIFT Code</label>
                    <input type="text" value={bank.swift_code || ""} onChange={(e) => updateBank(idx, 'swift_code', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Branch Name</label>
                    <input type="text" value={bank.branch_name || ""} onChange={(e) => updateBank(idx, 'branch_name', e.target.value)} className="mt-1 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-green-600 border border-transparent rounded-xl shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors">
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            {isSubmitting ? "Saving..." : "Save Vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}
