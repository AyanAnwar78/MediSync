import { useCallback, useEffect, useState } from 'react';
import { Pencil, Search } from 'lucide-react';
import { patientsApi } from '../../api/patientsApi';
import { extractErrorMessage, formatDate, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import Modal from '../../components/common/Modal';

export default function PatientsManagementPage() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await patientsApi.getAll(debouncedSearch);
      setPatients(list);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load patients.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEdit = (p) => {
    setEditing(p);
    setModalError('');
    setForm({
      fullName: p.fullName,
      phoneNumber: p.phoneNumber || '',
      dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).split('T')[0] : '',
      gender: p.gender || '',
      bloodGroup: p.bloodGroup || '',
      address: p.address || '',
      emergencyContact: p.emergencyContact || '',
      isUserActive: p.isUserActive,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setModalError('');
    setError('');
    setSuccess('');
    try {
      await patientsApi.update(editing.id, {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        bloodGroup: form.bloodGroup || null,
        address: form.address.trim() || null,
        emergencyContact: form.emergencyContact.trim() || null,
        isUserActive: form.isUserActive,
      });
      setSuccess(`Patient profile "${form.fullName}" updated.`);
      setEditing(null);
      await loadData();
    } catch (err) {
      setModalError(extractErrorMessage(err, 'Failed to update patient profile.'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'fullName',
      label: 'Patient',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      label: 'Contact',
      render: (row) => (
        <div className="text-xs">
          <p className="text-slate-800">{row.phoneNumber || '—'}</p>
          <p className="text-slate-500">{row.emergencyContact || 'No emergency contact'}</p>
        </div>
      ),
    },
    {
      key: 'bloodGroup',
      label: 'Demographics',
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">
            {row.gender || '—'} • {row.bloodGroup || 'Unknown'}
          </p>
          <p className="text-slate-500">DOB: {row.dateOfBirth ? formatDate(row.dateOfBirth) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'totalAppointments',
      label: 'Visits',
      render: (row) => (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {row.totalAppointments}
        </span>
      ),
    },
    {
      key: 'isUserActive',
      label: 'Status',
      render: (row) => <StatusBadge status={row.isUserActive ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          type="button"
          onClick={() => openEdit(row)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Patients Management"
      subtitle="View registered patient demographics, visit counts, and account status"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name, email, phone, blood group..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <p className="text-sm text-slate-500">{patients.length} patient(s)</p>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading patient records..." />
      ) : (
        <DataTable columns={columns} rows={patients} emptyMessage="No patients found." />
      )}

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Patient Record">
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AlertBanner type="error" message={modalError} onClose={() => setModalError('')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Full Name *</label>
            <input
              value={form.fullName || ''}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Phone</label>
            <input
              value={form.phoneNumber || ''}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Date of Birth</label>
            <input
              type="date"
              max={todayIso()}
              value={form.dateOfBirth || ''}
              onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Gender</label>
            <select
              value={form.gender || ''}
              onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Blood Group</label>
            <select
              value={form.bloodGroup || ''}
              onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Emergency Contact</label>
            <input
              value={form.emergencyContact || ''}
              onChange={(e) => setForm((p) => ({ ...p, emergencyContact: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Address</label>
            <input
              value={form.address || ''}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(form.isUserActive)}
              onChange={(e) => setForm((p) => ({ ...p, isUserActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            Account active
          </label>
          <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

