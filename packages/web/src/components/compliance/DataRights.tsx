import { useState } from 'react';
import { Download, Trash2, FileText, Shield, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

export function DataRights() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/compliance/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-ai-coach-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data export downloaded successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deleteConfirmEmail) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/compliance/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          confirmEmail: deleteConfirmEmail,
          reason: deleteReason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setMessage({
        type: 'success',
        text: 'Deletion request submitted. Your data will be permanently deleted within 30 days.',
      });
      setShowDeleteConfirm(false);
      setDeleteConfirmEmail('');
      setDeleteReason('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit deletion request',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Shield className="h-5 w-5 text-primary-500" />
          Data Rights
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal data. You have the right to access, export, and delete your data.
        </p>
      </div>

      {message && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Data Export */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 text-blue-500" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Export Your Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Download a copy of all your data including sessions, scripts, practice records, and
              knowledge base. Exported as JSON format.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Data Deletion */}
      <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 text-red-500" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Delete Your Account & Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Permanently delete all your data and account. This action cannot be undone. Data will be
              removed within 30 days as required by law.
            </p>

            {!showDeleteConfirm ? (
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Request Deletion
              </Button>
            ) : (
              <div className="mt-4 space-y-3 rounded-lg border border-red-200 bg-white p-4">
                <p className="text-xs font-medium text-red-600">
                  To confirm deletion, enter your account email address:
                </p>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                />
                <textarea
                  placeholder="Reason for deletion (optional)"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteRequest}
                    disabled={!deleteConfirmEmail || deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Deletion'
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmEmail('');
                      setDeleteReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legal Links */}
      <div className="flex gap-4 text-xs text-gray-500">
        <a href="/privacy" className="flex items-center gap-1 hover:text-gray-700">
          <FileText className="h-3 w-3" />
          Privacy Policy
        </a>
        <a href="/terms" className="flex items-center gap-1 hover:text-gray-700">
          <FileText className="h-3 w-3" />
          Terms of Service
        </a>
      </div>
    </div>
  );
}
