import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { departmentsApi } from '../../api/departmentsApi';
import { extractErrorMessage } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const EMPTY_FORM = { name: '', description: '', isActive: true };

export default function DepartmentsManagementPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await departmentsApi.getAll();
      setDepartments(list);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load departments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({
      name: dept.name,
      description: dept.description || '',
      isActive: dept.isActive,
    });
    setModalError('');
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
        await departmentsApi.update(editing.id, form);
        setSuccess(`Department "${form.name}" updated.`);
      } else {
        await departmentsApi.create(form);
        setSuccess(`Department "${form.name}" created.`);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(extractErrorMessage(err, 'Could not save department.'));
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
      await departmentsApi.remove(deleteTarget.id);
      setSuccess(`Department "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete department.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Department',
      render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => <span className="text-slate-600">{row.description || '—'}</span>,
    },
    {
      key: 'doctorCount',
      label: 'Doctors',
      render: (row) => (
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {row.doctorCount}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} />,
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
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Departments Management"
      subtitle="Configure clinical departments and active specialty units"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{departments.length} department(s) registered</p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner label="Loading departments..." />
      ) : (
        <DataTable columns={columns} rows={departments} emptyMessage="No departments configured." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Department' : 'Create Department'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <AlertBanner type="error" message={modalError} onClose={() => setModalError('')} />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Department Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="e.g., Dermatology"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Scope of care and clinical services"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            Department is active
          </label>
          <div className="flex justify-end gap-3 pt-2">
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
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Departments with assigned doctors cannot be deleted.`}
        confirmLabel="Delete"
        isSubmitting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
}

