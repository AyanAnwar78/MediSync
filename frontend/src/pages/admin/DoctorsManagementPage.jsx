import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { doctorsApi } from '../../api/doctorsApi';
import { departmentsApi } from '../../api/departmentsApi';
import { extractErrorMessage } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const DEFAULT_SCHEDULES = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00:00',
  endTime: '17:00:00',
  breakStartTime: '13:00:00',
  breakEndTime: '14:00:00',
  isActive: true,
}));

const EMPTY_CREATE = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  departmentId: '',
  specialization: '',
  licenseNumber: '',
  consultationFee: 120,
  slotDurationMinutes: 30,
  maxDailyAppointments: 16,
  yearsOfExperience: 5,
  bio: '',
  isAvailableForBooking: true,
  isUserActive: true,
  seedDefaultSchedule: true,
};

export default function DoctorsManagementPage() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CREATE);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [docList, deptList] = await Promise.all([
        doctorsApi.getAll({
          search: debouncedSearch || undefined,
          departmentId: departmentFilter || undefined,
        }),
        departmentsApi.getAll(),
      ]);
      setDoctors(docList);
      setDepartments(deptList);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load doctors.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, departmentFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setModalError('');
    setForm({
      ...EMPTY_CREATE,
      departmentId: departments.find((d) => d.isActive)?.id || '',
    });
    setModalOpen(true);
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setModalError('');
    setForm({
      fullName: doc.fullName,
      email: doc.email,
      password: '',
      phoneNumber: doc.phoneNumber || '',
      departmentId: doc.departmentId,
      specialization: doc.specialization,
      licenseNumber: doc.licenseNumber,
      consultationFee: doc.consultationFee,
      slotDurationMinutes: doc.slotDurationMinutes,
      maxDailyAppointments: doc.maxDailyAppointments,
      yearsOfExperience: doc.yearsOfExperience,
      bio: doc.bio || '',
      isAvailableForBooking: doc.isAvailableForBooking,
      isUserActive: doc.isUserActive,
      seedDefaultSchedule: false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalError('');
    setError('');
    setSuccess('');

    try {
      if (editing) {
        await doctorsApi.update(editing.id, {
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim() || null,
          departmentId: Number(form.departmentId),
          specialization: form.specialization.trim(),
          licenseNumber: form.licenseNumber.trim(),
          consultationFee: Number(form.consultationFee),
          slotDurationMinutes: Number(form.slotDurationMinutes),
          maxDailyAppointments: Number(form.maxDailyAppointments),
          yearsOfExperience: Number(form.yearsOfExperience),
          bio: form.bio.trim() || null,
          isAvailableForBooking: form.isAvailableForBooking,
          isUserActive: form.isUserActive,
        });
        setSuccess(`Doctor profile "${form.fullName}" updated.`);
      } else {
        await doctorsApi.create({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          phoneNumber: form.phoneNumber.trim() || null,
          departmentId: Number(form.departmentId),
          specialization: form.specialization.trim(),
          licenseNumber: form.licenseNumber.trim(),
          consultationFee: Number(form.consultationFee),
          slotDurationMinutes: Number(form.slotDurationMinutes),
          maxDailyAppointments: Number(form.maxDailyAppointments),
          yearsOfExperience: Number(form.yearsOfExperience),
          bio: form.bio.trim() || null,
          isAvailableForBooking: form.isAvailableForBooking,
          schedules: form.seedDefaultSchedule ? DEFAULT_SCHEDULES : [],
        });
        setSuccess(`Doctor "${form.fullName}" created successfully.`);
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(extractErrorMessage(err, 'Unable to save doctor profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const resp = await doctorsApi.remove(deleteTarget.id);
      setSuccess(resp.message || 'Doctor updated.');
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete doctor.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'fullName',
      label: 'Doctor',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'departmentName',
      label: 'Department & Specialty',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.departmentName}</p>
          <p className="text-xs text-slate-500">{row.specialization}</p>
        </div>
      ),
    },
    {
      key: 'licenseNumber',
      label: 'License / Exp',
      render: (row) => (
        <div>
          <p className="font-mono text-xs text-slate-700">{row.licenseNumber}</p>
          <p className="text-xs text-slate-500">{row.yearsOfExperience} yrs</p>
        </div>
      ),
    },
    {
      key: 'slotDurationMinutes',
      label: 'Capacity & Fee',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800">
            {row.slotDurationMinutes}m • {row.maxDailyAppointments}/day
          </p>
          <p className="text-slate-500">${Number(row.consultationFee).toFixed(0)} fee</p>
        </div>
      ),
    },
    {
      key: 'isAvailableForBooking',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.isUserActive ? 'Active' : 'Inactive'} />
          <StatusBadge status={row.isAvailableForBooking ? 'Available' : 'Unavailable'} />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Doctors Management"
      subtitle="Add, configure, and manage hospital medical staff"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, specialty, license..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Add Doctor
        </button>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading doctors directory..." />
      ) : (
        <DataTable columns={columns} rows={doctors} emptyMessage="No doctors match your search." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Doctor Profile' : 'Add New Doctor'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AlertBanner type="error" message={modalError} onClose={() => setModalError('')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Full Name *</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          {!editing && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Initial Password *
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Phone</label>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Department *</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Specialization *</label>
            <input
              value={form.specialization}
              onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">License Number *</label>
            <input
              value={form.licenseNumber}
              onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Fee ($) *</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.consultationFee}
              onChange={(e) => setForm((p) => ({ ...p, consultationFee: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
              Slot Duration (min) *
            </label>
            <input
              type="number"
              min="10"
              max="120"
              value={form.slotDurationMinutes}
              onChange={(e) => setForm((p) => ({ ...p, slotDurationMinutes: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
              Max Daily Appointments *
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.maxDailyAppointments}
              onChange={(e) => setForm((p) => ({ ...p, maxDailyAppointments: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
              Years of Experience *
            </label>
            <input
              type="number"
              min="0"
              max="70"
              value={form.yearsOfExperience}
              onChange={(e) => setForm((p) => ({ ...p, yearsOfExperience: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Clinical Bio</label>
            <textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isAvailableForBooking}
                onChange={(e) => setForm((p) => ({ ...p, isAvailableForBooking: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              Available for booking
            </label>

            {editing ? (
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isUserActive}
                  onChange={(e) => setForm((p) => ({ ...p, isUserActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600"
                />
                Account active
              </label>
            ) : (
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.seedDefaultSchedule}
                  onChange={(e) => setForm((p) => ({ ...p, seedDefaultSchedule: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600"
                />
                Apply default Mon–Fri (09:00–17:00) schedule
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Doctor"
        message={`Remove "${deleteTarget?.fullName}"? Doctors with existing appointment history will be deactivated instead of deleted to preserve records.`}
        confirmLabel="Confirm"
        isSubmitting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
}

