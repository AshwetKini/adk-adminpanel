// src/app/employee/shipments/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { shipmentApi } from '@/lib/api';
import type { Shipment } from '@/types/shipment';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function toInputDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

type FormState = {
  soNo: string;
  ctns: string;
  itemName: string;
  value: string;
  pcsRaw: string;
  rateRaw: string;
  kgs: string;
  cbm: string;
  amount: string;
  securityDeposit: string;
  chargesOnDeposit: string;
  depositCharges: string;
  localTransportCharges: string;
  outstationTransportCharges: string;
  packingCharges: string;
  gstBillingCharges: string;
  extraChargesIfAny: string;
  discountIfAny: string;
  totalNetCharges: string;
  date: string;
  receiptDate: string;
  deliveryLocation: string;
  remarks: string;
};

function toNumberOrUndefined(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export default function EditEmployeeShipmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    (async () => {
      setLoading(true);
      try {
        const data = await shipmentApi.get(id);
        setShipment(data);
        setForm({
          soNo: data.soNo ?? '',
          ctns: data.ctns != null ? String(data.ctns) : '',
          itemName: data.itemName ?? '',
          value: data.value != null ? String(data.value) : '',
          pcsRaw: (data as any).pcsRaw ?? '',
          rateRaw: (data as any).rateRaw ?? '',
          kgs: data.kgs != null ? String(data.kgs) : '',
          cbm: data.cbm != null ? String(data.cbm) : '',
          amount: data.amount != null ? String(data.amount) : '',
          securityDeposit:
            data.securityDeposit != null ? String(data.securityDeposit) : '',
          chargesOnDeposit:
            data.chargesOnDeposit != null ? String(data.chargesOnDeposit) : '',
          depositCharges:
            data.depositCharges != null ? String(data.depositCharges) : '',
          localTransportCharges:
            data.localTransportCharges != null
              ? String(data.localTransportCharges)
              : '',
          outstationTransportCharges:
            data.outstationTransportCharges != null
              ? String(data.outstationTransportCharges)
              : '',
          packingCharges:
            data.packingCharges != null ? String(data.packingCharges) : '',
          gstBillingCharges:
            data.gstBillingCharges != null ? String(data.gstBillingCharges) : '',
          extraChargesIfAny:
            data.extraChargesIfAny != null ? String(data.extraChargesIfAny) : '',
          discountIfAny:
            data.discountIfAny != null ? String(data.discountIfAny) : '',
          totalNetCharges:
            data.totalNetCharges != null ? String(data.totalNetCharges) : '',
          date: toInputDate(data.date),
          receiptDate: toInputDate(data.receiptDate),
          deliveryLocation: data.deliveryLocation ?? '',
          remarks: data.remarks ?? '',
        });
      } catch (err: any) {
        alert(err?.response?.data?.message ?? 'Failed to load shipment');
        router.push('/employee/shipments');
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id, router]);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!form) return;
      setForm({ ...form, [field]: e.target.value });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !params?.id) return;

    setSaving(true);
    try {
      const payload: Partial<Shipment> = {
        soNo: form.soNo || undefined,
        ctns: toNumberOrUndefined(form.ctns),
        itemName: form.itemName || undefined,
        value: toNumberOrUndefined(form.value),
        // composite PCS/Rate
        pcsRaw: form.pcsRaw || undefined,
        rateRaw: form.rateRaw || undefined,
        kgs: toNumberOrUndefined(form.kgs),
        cbm: toNumberOrUndefined(form.cbm),
        amount: toNumberOrUndefined(form.amount),
        securityDeposit: toNumberOrUndefined(form.securityDeposit),
        chargesOnDeposit: toNumberOrUndefined(form.chargesOnDeposit),
        depositCharges: toNumberOrUndefined(form.depositCharges),
        localTransportCharges: toNumberOrUndefined(
          form.localTransportCharges,
        ),
        outstationTransportCharges: toNumberOrUndefined(
          form.outstationTransportCharges,
        ),
        packingCharges: toNumberOrUndefined(form.packingCharges),
        gstBillingCharges: toNumberOrUndefined(form.gstBillingCharges),
        extraChargesIfAny: toNumberOrUndefined(form.extraChargesIfAny),
        discountIfAny: toNumberOrUndefined(form.discountIfAny),
        totalNetCharges: toNumberOrUndefined(form.totalNetCharges),
        date: form.date || undefined,
        receiptDate: form.receiptDate || undefined,
        deliveryLocation: form.deliveryLocation || undefined,
        remarks: form.remarks || undefined,
      };

      await shipmentApi.update(params.id, payload);
      alert('Shipment updated successfully');
      router.push(`/employee/shipments/${params.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to update shipment');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form || !shipment) {
    return (
      <div className="p-4 text-sm text-slate-600">
        {loading ? 'Loading shipment...' : 'Shipment not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Edit Shipment {shipment.shipmentId ?? shipment.id}
        </h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/employee/shipments/${shipment.id}`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/employee/shipments')}
          >
            Back to list
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  SO No.
                </label>
                <Input
                  value={form.soNo}
                  onChange={handleChange('soNo')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  CTNs
                </label>
                <Input
                  value={form.ctns}
                  onChange={handleChange('ctns')}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  Item Name
                </label>
                <Input
                  value={form.itemName}
                  onChange={handleChange('itemName')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Value
                </label>
                <Input
                  value={form.value}
                  onChange={handleChange('value')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  PCS (composite, e.g. 1100+500)
                </label>
                <Input
                  value={form.pcsRaw}
                  onChange={handleChange('pcsRaw')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Rate (composite, e.g. 50+10)
                </label>
                <Input
                  value={form.rateRaw}
                  onChange={handleChange('rateRaw')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  KGS
                </label>
                <Input
                  value={form.kgs}
                  onChange={handleChange('kgs')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  CBM
                </label>
                <Input
                  value={form.cbm}
                  onChange={handleChange('cbm')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Amount
                </label>
                <Input
                  value={form.amount}
                  onChange={handleChange('amount')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Security Deposit
                </label>
                <Input
                  value={form.securityDeposit}
                  onChange={handleChange('securityDeposit')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Charges on Deposit
                </label>
                <Input
                  value={form.chargesOnDeposit}
                  onChange={handleChange('chargesOnDeposit')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Deposit Charges
                </label>
                <Input
                  value={form.depositCharges}
                  onChange={handleChange('depositCharges')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Local Transport Charges
                </label>
                <Input
                  value={form.localTransportCharges}
                  onChange={handleChange('localTransportCharges')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Outstation Transport Charges
                </label>
                <Input
                  value={form.outstationTransportCharges}
                  onChange={handleChange('outstationTransportCharges')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Packing Charges
                </label>
                <Input
                  value={form.packingCharges}
                  onChange={handleChange('packingCharges')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  GST Billing Charges
                </label>
                <Input
                  value={form.gstBillingCharges}
                  onChange={handleChange('gstBillingCharges')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Extra Charges If Any
                </label>
                <Input
                  value={form.extraChargesIfAny}
                  onChange={handleChange('extraChargesIfAny')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Discount If Any
                </label>
                <Input
                  value={form.discountIfAny}
                  onChange={handleChange('discountIfAny')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Total Net Charges
                </label>
                <Input
                  value={form.totalNetCharges}
                  onChange={handleChange('totalNetCharges')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Date
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={handleChange('date')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Receipt Date
                </label>
                <Input
                  type="date"
                  value={form.receiptDate}
                  onChange={handleChange('receiptDate')}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  Delivery Location
                </label>
                <Input
                  value={form.deliveryLocation}
                  onChange={handleChange('deliveryLocation')}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  Remarks
                </label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={form.remarks}
                  onChange={handleChange('remarks')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/employee/shipments/${shipment.id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
