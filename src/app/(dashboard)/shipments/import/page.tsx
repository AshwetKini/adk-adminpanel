// src/app/(dashboard)/shipments/import/page.tsx

'use client';

import { useState } from 'react';
import { shipmentApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export default function ShipmentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setErrorMessage('Please select an Excel file (.xlsx) first.');
      return;
    }

    setIsImporting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await shipmentApi.importExcel(file);
      setSuccessMessage(
        `${result.message || 'Import completed.'} Inserted rows: ${result.insertedCount}.`,
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to import shipments.';
      setErrorMessage(msg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Import Shipments</h1>
          <p className="text-sm text-gray-600">
            Upload the daily shipment Excel file. Headers must exactly match the
            required template (Party Name, USER ID, MOBILE Number, SO No., VALUE,
            Total Net Charges, etc.).
          </p>

          <form onSubmit={handleImport} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Excel file (.xlsx)
              </label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
            </div>

            <Button type="submit" disabled={isImporting || !file}>
              {isImporting ? 'Importing…' : 'Import Shipments'}
            </Button>
          </form>

          {successMessage && (
            <p className="text-sm text-green-600 mt-2">{successMessage}</p>
          )}

          {errorMessage && (
            <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
