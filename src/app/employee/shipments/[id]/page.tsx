'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { shipmentApi } from '@/lib/api';
import type { Shipment } from '@/types/shipment';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

type DetailProps = { label: string; value?: string | number | null };

function Detail({ label, value }: DetailProps) {
  const text =
    value !== undefined && value !== null && value !== '' ? String(value) : '-';

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm text-slate-900">{text}</div>
    </div>
  );
}

// Extend Shipment locally with new composite + breakdown fields
type ShipmentDetail = Shipment & {
  pcsRaw?: string;
  pcsParts?: number[];
  rateRaw?: string;
  rateParts?: number[];
  // include _id so we can use it as a unique React key when present
  detailItems?: { _id?: string; name: string; qty: number }[];
};

export default function EmployeeShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    (async () => {
      setLoading(true);
      try {
        const data = await shipmentApi.get(id);
        setShipment(data as ShipmentDetail);
      } catch (err: any) {
        alert(err?.response?.data?.message ?? 'Failed to load shipment');
        router.push('/employee/shipments');
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-600">
        Loading shipment...
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-4 text-sm text-red-600">
        Shipment not found.
      </div>
    );
  }

  const shipmentId = shipment.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Shipment {shipment.shipmentId ?? shipmentId}
        </h1>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() =>
              router.push(`/employee/shipments/${shipmentId}/edit`)
            }
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/employee/shipments')}
          >
            Back to list
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Customer" value={shipment.customerName} />
            <Detail label="User ID" value={shipment.userId} />
            <Detail label="Mobile" value={shipment.mobileNumber} />
            <Detail label="Shipment ID" value={shipment.shipmentId} />
            <Detail label="SO No." value={shipment.soNo} />
            <Detail label="Item" value={shipment.itemName} />
            <Detail label="CTNs" value={shipment.ctns} />
            {/* Use raw PCS expression when available */}
            <Detail
              label="PCS"
              value={shipment.pcsRaw ?? shipment.pcs}
            />
            <Detail label="KGS" value={shipment.kgs} />
            <Detail label="CBM" value={shipment.cbm} />
            <Detail label="Value" value={shipment.value} />
            {/* Use raw Rate expression when available */}
            <Detail
              label="Rate"
              value={shipment.rateRaw ?? shipment.rate}
            />
            <Detail label="Amount" value={shipment.amount} />
            <Detail
              label="Security Deposit"
              value={shipment.securityDeposit}
            />
            <Detail
              label="Charges on Deposit"
              value={shipment.chargesOnDeposit}
            />
            <Detail
              label="Deposit Charges"
              value={shipment.depositCharges}
            />
            <Detail
              label="Local Transport Charges"
              value={shipment.localTransportCharges}
            />
            <Detail
              label="Outstation Transport Charges"
              value={shipment.outstationTransportCharges}
            />
            <Detail
              label="Packing Charges"
              value={shipment.packingCharges}
            />
            <Detail
              label="GST Billing Charges"
              value={shipment.gstBillingCharges}
            />
            <Detail
              label="Extra Charges If Any"
              value={shipment.extraChargesIfAny}
            />
            <Detail
              label="Discount If Any"
              value={shipment.discountIfAny}
            />
            <Detail
              label="Total Net Charges"
              value={shipment.totalNetCharges}
            />
            <Detail label="Date" value={formatDate(shipment.date)} />
            <Detail
              label="Receipt Date"
              value={formatDate(shipment.receiptDate)}
            />
            <Detail
              label="Delivery Location"
              value={shipment.deliveryLocation}
            />
          </div>

          {/* Optional PCS breakdown list */}
          {shipment.detailItems && shipment.detailItems.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                PCS Breakdown
              </div>
              <ul className="mt-1 space-y-1 text-sm text-slate-800">
                {shipment.detailItems.map((d, index) => (
                  <li
                    key={d._id ?? `${d.name}-${d.qty}-${index}`}
                  >
                    {d.name}: {d.qty}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {shipment.remarks && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Remarks
              </div>
              <div className="mt-1 whitespace-pre-line text-sm text-slate-800">
                {shipment.remarks}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
