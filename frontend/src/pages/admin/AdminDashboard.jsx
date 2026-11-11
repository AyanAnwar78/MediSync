import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  CalendarX2,
  CheckCircle2,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi';
import { extractErrorMessage } from '../../utils/formatters';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AlertBanner from '../../components/common/AlertBanner';
import StatusBadge from '../../components/common/StatusBadge';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await analyticsApi.getAdminSummary();
      setData(summary);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load hospital analytics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <DashboardLayout
      title="Hospital Operations & Analytics"
      subtitle="Real-time doctor availability, department demand, and workload distribution"
    >
      <AlertBanner type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <LoadingSpinner label="Loading hospital analytics..." />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Doctors"
                value={data.totalDoctors}
                subtitle={`${data.totalDepartments} active departments`}
                icon={Stethoscope}
                tone="teal"
              />
              <StatCard
                title="Available Doctors"
                value={data.availableDoctors}
                subtitle="Active & not on approved leave today"
                icon={UserCheck}
                tone="emerald"
              />
              <StatCard
                title="Total Patients"
                value={data.totalPatients}
                subtitle="Registered patient profiles"
                icon={Users}
                tone="sky"
              />
              <StatCard
                title="Total Appointments"
                value={data.totalAppointments}
                subtitle={`${data.pendingAppointments} pending • ${data.confirmedAppointments} confirmed`}
                icon={CalendarCheck}
                tone="indigo"
              />
              <StatCard
                title="Completed"
                value={data.completedAppointments}
                subtitle="Finished consultations"
                icon={CheckCircle2}
                tone="emerald"
              />
              <StatCard
                title="Cancelled"
                value={data.cancelledAppointments}
                subtitle="Slots automatically released"
                icon={CalendarX2}
                tone="rose"
              />
              <StatCard
                title="Smart Allocated"
                value={data.smartAllocatedAppointments}
                subtitle="Booked via weighted recommendation engine"
                icon={Sparkles}
                tone="teal"
              />
              <StatCard
                title="Completion Rate"
                value={
                  data.totalAppointments > 0
                    ? `${Math.round((data.completedAppointments / data.totalAppointments) * 100)}%`
                    : '0%'
                }
                subtitle="Across all recorded appointments"
                icon={Activity}
                tone="amber"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Most Demanded Departments */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Most Demanded Departments</h2>
                    <p className="text-xs text-slate-500">Ranked by total appointment volume</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {data.mostDemandedDepartments.length === 0 ? (
                    <p className="text-sm text-slate-500">No department metrics available yet.</p>
                  ) : (
                    (() => {
                      const maxAppts = Math.max(
                        1,
                        ...data.mostDemandedDepartments.map((d) => d.totalAppointments)
                      );
                      return data.mostDemandedDepartments.map((dept) => {
                        const width = Math.round((dept.totalAppointments / maxAppts) * 100);
                        return (
                          <div key={dept.departmentId} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-semibold text-slate-900">{dept.departmentName}</span>
                                <span className="ml-2 text-xs text-slate-500">
                                  ({dept.doctorCount} doctor{dept.doctorCount === 1 ? '' : 's'})
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {dept.totalAppointments} total • {dept.activeAppointments} active
                              </span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-teal-600 transition-all"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              {/* Doctor Workload Distribution */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Doctor Workload Distribution</h2>
                    <p className="text-xs text-slate-500">Today&apos;s utilization and upcoming queue</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">Doctor</th>
                        <th className="px-3 py-2.5">Today</th>
                        <th className="px-3 py-2.5">Upcoming</th>
                        <th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.doctorWorkloadDistribution.map((doc) => (
                        <tr key={doc.doctorId} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-slate-900">{doc.doctorName}</p>
                            <p className="text-[11px] text-slate-500">{doc.departmentName}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {doc.todayBookedCount}/{doc.maxDailyAppointments}
                              </span>
                              <span className="text-slate-400">({doc.utilizationRateTodayPercent}%)</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">
                            {doc.upcomingActiveCount}
                          </td>
                          <td className="px-3 py-2.5">
                            {doc.isOnLeaveToday ? (
                              <StatusBadge status="Rejected" />
                            ) : doc.isAvailableForBooking ? (
                              <StatusBadge status="Available" />
                            ) : (
                              <StatusBadge status="Unavailable" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </DashboardLayout>
  );
}

