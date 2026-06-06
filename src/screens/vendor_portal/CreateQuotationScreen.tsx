"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QuotationService, TaxRate, QuotationItemPayload, CreateQuotationPayload } from "@/api_service/quotation";
import { RFQ } from "@/api_service/rfq";
import { ArrowLeft, Loader2, Save, UploadCloud, File, X, AlertCircle } from "lucide-react";

type ItemField = "unit_price" | "discount_pct" | "notes";

export default function CreateQuotationScreen({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [items, setItems] = useState<QuotationItemPayload[]>([]);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [validityDays, setValidityDays] = useState(30);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [currency] = useState("INR");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rfqData, taxesData] = await Promise.all([
          QuotationService.getVendorRFQ(Number(rfqId)),
          QuotationService.getTaxRates(),
        ]);
        setRfq(rfqData);
        setTaxRates(taxesData);
        setItems((rfqData.items || []).map((item) => ({
          rfq_item_id: item.id || 0,
          unit_price: 0,
          quantity: item.quantity,
          tax_rate_ids: [],
          discount_pct: 0,
          notes: "",
        })));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load quotation data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [rfqId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  };

  const getRfqItem = (rfqItemId: number) => rfq?.items?.find((item) => item.id === rfqItemId);

  const getSelectedTaxes = (item: QuotationItemPayload) => {
    return taxRates.filter((tax) => item.tax_rate_ids.includes(tax.id));
  };

  const getLineSubtotal = (item: QuotationItemPayload) => {
    const subtotal = item.quantity * item.unit_price;
    return subtotal * (1 - item.discount_pct / 100);
  };

  const getLineTaxAmount = (item: QuotationItemPayload) => {
    const subtotal = getLineSubtotal(item);
    return getSelectedTaxes(item).reduce((sum, tax) => sum + (subtotal * tax.rate / 100), 0);
  };

  const getLineTotal = (item: QuotationItemPayload) => getLineSubtotal(item) + getLineTaxAmount(item);
  const subtotal = items.reduce((sum, item) => sum + getLineSubtotal(item), 0);
  const taxTotal = items.reduce((sum, item) => sum + getLineTaxAmount(item), 0);
  const grandTotal = subtotal + taxTotal;

  const updateItem = (index: number, field: ItemField, value: number | string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const toggleTax = (index: number, taxRateId: number) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index].tax_rate_ids;
      next[index] = {
        ...next[index],
        tax_rate_ids: current.includes(taxRateId)
          ? current.filter((id) => id !== taxRateId)
          : [...current, taxRateId],
      };
      return next;
    });
  };

  const validate = () => {
    if (items.length === 0) return "No RFQ items are available for quotation.";
    if (items.some((item) => item.unit_price <= 0)) return "Enter a unit price greater than 0 for every item.";
    if (deliveryDays < 1 || validityDays < 1) return "Delivery and validity days must be greater than 0.";
    return null;
  };

  const openReview = (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsReviewOpen(true);
  };

  const submitQuotation = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateQuotationPayload = {
        rfq_id: Number(rfqId),
        delivery_days: deliveryDays,
        validity_days: validityDays,
        payment_terms: paymentTerms || undefined,
        currency,
        notes: notes || undefined,
        items,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));
      files.forEach((file) => formData.append("attachments", file));

      await QuotationService.submitQuotation(formData);
      router.push("/quotation");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit quotation");
      setIsReviewOpen(false);
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

  if (!rfq) return null;

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Quotation</h1>
          <p className="mt-1 text-gray-500">Provide pricing for <span className="font-semibold text-gray-700">{rfq.title}</span></p>
        </div>
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

      <form onSubmit={openReview} className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => {
                  const rfqItem = getRfqItem(item.rfq_item_id);
                  return (
                    <tr key={item.rfq_item_id}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{rfqItem?.item_name || "Item"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 min-w-64">{rfqItem?.description || "-"}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.unit_price}
                          onChange={(event) => updateItem(index, "unit_price", Number(event.target.value))}
                          className="block w-32 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 min-w-56">
                        <div className="space-y-2">
                          {taxRates.map((tax) => (
                            <label key={tax.id} className="flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={item.tax_rate_ids.includes(tax.id)}
                                onChange={() => toggleTax(index, tax.id)}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                              />
                              <span>{tax.name} ({tax.rate}%)</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.discount_pct}
                          onChange={(event) => updateItem(index, "discount_pct", Number(event.target.value))}
                          className="block w-24 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">{formatCurrency(getLineTotal(item))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Subtotal</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Taxes</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(taxTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-right text-base font-bold text-gray-900">Grand Total</td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-green-700">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Terms</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Days
                <input type="number" min="1" required value={deliveryDays} onChange={(event) => setDeliveryDays(Number(event.target.value))} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Validity Days
                <input type="number" min="1" required value={validityDays} onChange={(event) => setValidityDays(Number(event.target.value))} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm" />
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Terms
              <input type="text" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Notes
              <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm" />
            </label>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-6">Attachments</h2>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10 hover:bg-gray-50">
              <span className="text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-300" />
                <span className="mt-4 block text-sm font-semibold text-green-600">Upload files</span>
                <span className="text-xs text-gray-500">PDF, DOCX, XLSX up to 10MB</span>
              </span>
            </button>
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(event) => setFiles((prev) => [...prev, ...Array.from(event.target.files || [])])} />
            {files.length > 0 && (
              <ul className="mt-6 space-y-3">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center overflow-hidden">
                      <File className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => setFiles(files.filter((_, itemIndex) => itemIndex !== index))} className="ml-4 p-1 text-gray-400 hover:text-red-500">
                      <X className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="rounded-lg px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 mr-4">
            Cancel
          </button>
          <button type="submit" className="inline-flex items-center rounded-lg bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
            <Save className="mr-2 h-5 w-5" />
            Review Quotation
          </button>
        </div>
      </form>

      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Review Quotation</h2>
              <p className="mt-1 text-sm text-gray-500">Once submitted, this quotation cannot be changed later.</p>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.rfq_item_id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{getRfqItem(item.rfq_item_id)?.item_name}</td>
                      <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-sm">{getSelectedTaxes(item).map((tax) => tax.name).join(", ") || "No tax"}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(getLineTotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Taxes</span><span>{formatCurrency(taxTotal)}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold"><span>Grand Total</span><span>{formatCurrency(grandTotal)}</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button type="button" disabled={isSubmitting} onClick={() => setIsReviewOpen(false)} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                Edit
              </button>
              <button type="button" disabled={isSubmitting} onClick={submitQuotation} className="inline-flex items-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Final Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
