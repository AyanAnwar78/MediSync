import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientsApi } from '../../api/patientsApi';
import { extractErrorMessage, todayIso } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';

export default function PatientProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user?.patientId) return;
    setLoading(true);
    setError('');
    try {
      const p = await patientsApi.getById(user.patientId);
      setForm({
        fullName: p.fullName || '',
        email: p.email || '',
        phoneNumber: p.phoneNumber || '',
        dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).split('T')[0] : '',
        gender: p.gender || '',
        bloodGroup: p.bloodGroup || '',
        address: p.address || '',
        emergencyContact: p.emergencyContact || '',
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load profile.'));
    } finally {
      setLoading(false);
    }
  }, [user?.patientId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.patientId || !form) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await patientsApi.update(user.patientId, {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        bloodGroup: form.bloodGroup || null,
        address: form.address.trim() || null,
        emergencyContact: form.emergencyContact.trim() || null,
      });
      await refreshProfile();
      setSuccess('Your profile has been updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="My Patient Profile"
      subtitle="Keep your demographic and emergency contact information current"
    >
      <AlertBanner type="error" message={error} onClose={() => setError('')} />
      <AlertBanner type="success" message={success} onClose={() => setSuccess('')} />

      {loading || !form ? (
        <LoadingSpinner label="Loading profile..." />
      ) : (
        <form
          onSubmit={handleSave}
          className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Full Name *</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Email</label>
              <input
                value={form.email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Phone</label>
              <input
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Date of Birth</label>
              <input
                type="date"
                max={todayIso()}
                value={form.dateOfBirth}
                onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
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
                value={form.bloodGroup}
                onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
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
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                Emergency Contact
              </label>
              <input
                value={form.emergencyContact}
                onChange={(e) => setForm((p) => ({ ...p, emergencyContact: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}

