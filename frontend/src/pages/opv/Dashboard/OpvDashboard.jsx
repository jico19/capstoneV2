import { useNavigate } from "react-router-dom";
import { useApplication } from "/src/hooks/useApplications";
import StatusBadge from "/src/components/StatusBadge";
import DateFormatter from "/src/components/DateFormatter";
import ActionGroup from "/src/components/ActionButton";
import { Eye, FileSignature, CheckCircle, Clock, LayoutDashboard } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const OpvDashboard = () => {
    // const { data: application, isLoading, isError } = useApplication();

    const navigate = useNavigate();

    // if (isLoading) {
    //     return (
    //         <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    //             <span className="loading loading-spinner loading-lg text-blue-600"></span>
    //             <p className="text-slate-500 font-medium animate-pulse">Loading OPV Registry...</p>
    //         </div>
    //     );
    // }

    // if (isError) {
    //     return (
    //         <div className="p-10 text-center text-red-500 bg-red-50 rounded-xl border border-red-200 font-bold max-w-3xl mx-auto mt-10">
    //             Failed to load registry data. Please check your connection.
    //         </div>
    //     );
    // }

    // ==========================================
    // Direct Calculations (No useMemo used as requested)
    // ==========================================
    const safeApplications = [];

    const totalApplications = safeApplications.length;

    // Applications waiting for OPV action
    const pendingReview = safeApplications.filter(app =>
        ['FORWARDED_TO_OPV', 'PENDING'].includes(app.status)
    ).length;

    // Applications that are already processed/approved
    const approvedApplications = safeApplications.filter(app =>
        ['APPROVED', 'PAID', 'RELEASED'].includes(app.status)
    ).length;

    const rejectedApplications = safeApplications.filter(app =>
        app.status === 'REJECTED'
    ).length;

    // ==========================================
    // Recharts Data Prep
    // ==========================================
    const chartData = [
        { name: 'Pending Review', value: pendingReview, color: '#f59e0b' }, // Amber
        { name: 'Approved', value: approvedApplications, color: '#10b981' }, // Green
        { name: 'Rejected', value: rejectedApplications, color: '#ef4444' }, // Red
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                        <LayoutDashboard size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">OPV Dashboard</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">Office of the Provincial Veterinarian — Overview</p>
                    </div>
                </div>
            </div>

            {/* Top Row: KPI Cards & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Side: Summary Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-6  border border-slate-200 flex items-center gap-4">
                        <div className="p-4 bg-slate-100 rounded-xl text-slate-600">
                            <FileSignature size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
                            <h3 className="text-4xl font-black text-slate-800">{totalApplications}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6  border flex items-center gap-4 relative overflow-hidden">
                        <div className="p-4 bg-amber-50 rounded-xl text-amber-600">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-600/70 uppercase tracking-wider">Awaiting Review</p>
                            <h3 className="text-4xl font-black text-amber-700">{pendingReview}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 border flex items-center gap-4 sm:col-span-2">
                        <div className="p-4 bg-green-50 rounded-xl text-green-600">
                            <CheckCircle size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-green-600/70 uppercase tracking-wider">Successfully Processed</p>
                            <h3 className="text-4xl font-black text-green-700">{approvedApplications}</h3>
                        </div>
                    </div>

                </div>

                {/* Right Side: Recharts Donut Chart */}
                <div className="bg-white p-6 border border-slate-200  flex flex-col items-center justify-center min-h-[250px]">
                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-2 w-full text-left">Status Distribution</h3>
                    {totalApplications === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
                            No data to visualize
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Application Registry</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="p-5">Application ID</th>
                                <th className="p-5">Farmer Name</th>
                                <th className="p-5 text-center">Status</th>
                                <th className="p-5">Transport Date</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">

                            {safeApplications.length === 0 && (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                            <FileSignature size={48} className="mb-4 opacity-20" />
                                            <p className="text-sm font-medium">Registry is currently empty.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {safeApplications.map((data) => (
                                <tr key={data.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-5">
                                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 font-mono text-xs font-bold rounded-lg border border-slate-200">
                                            {data.application_id}
                                        </span>
                                    </td>
                                    <td className="p-5 font-bold text-slate-800 text-sm">
                                        {data.farmer_name}
                                    </td>
                                    <td className="p-5 text-center">
                                        <StatusBadge status={data.status} />
                                    </td>
                                    <td className="p-5 text-sm font-medium text-slate-600">
                                        <DateFormatter date={data.transport_date} />
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex justify-end">
                                            <ActionGroup
                                                buttons={[
                                                    {
                                                        icon: Eye,
                                                        label: "Review",
                                                        onclick: () => navigate(`application/detail/${data.id}`),
                                                        disable: false
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default OpvDashboard;