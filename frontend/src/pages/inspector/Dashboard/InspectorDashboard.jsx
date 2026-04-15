import React from 'react';
import {
    QrCode,
    History,
    ArrowRight,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Calendar,
    Clock
} from 'lucide-react';
import KPICard from '/src/components/KPICard';
import { useNavigate } from 'react-router-dom';

// --- Sub-component: Recent Scan Item ---
const ScanItem = ({ id, farmer, status, time }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-4">
            <div className={status === 'success' ? 'text-green-600' : 'text-red-500'}>
                {status === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <div>
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{id}</p>
                <p className="text-xs text-gray-500 font-medium">{farmer}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{time}</p>
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-green-700 mt-1">
                Details <ArrowRight size={10} />
            </div>
        </div>
    </div>
);

const InspectorDashboard = ({ stats = { today: 0, week: 0, month: 0 }, recentScans = [] }) => {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen p-8 space-y-8">
            {/* 1. Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Inspector Dashboard</h1>
                    <p className="text-gray-500 text-sm font-medium">Checkpoint Operations & Verification Log</p>
                </div>
            </div>

            {/* 2. Metrics Grid (KPIs from image) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Today's Scans"
                    value={stats.today}
                    icon={Clock}
                    colorClass="bg-blue-50 text-blue-600"
                    subtitle="total of today scans"
                />
                <KPICard
                    title="Total Scans"
                    value={stats.week}
                    icon={TrendingUp}
                    colorClass="bg-green-50 text-green-600"
                    subtitle="Total scans in totals"
                />
                <KPICard
                    title="Monthly Totals"
                    value={stats.month}
                    icon={Calendar}
                    colorClass="bg-purple-50 text-purple-600"
                    subtitle="Monthly Scans"
                />
            </div>

            {/* 3. Primary Scanner Action */}
            <div className="bg-white border border-gray-200 p-8 flex flex-col items-center text-center space-y-6">
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Ready for Inspection?</h2>
                    <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
                        Scan the Permit QR code to instantly verify livestock transport legality.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/inspector/scan/')}
                    className="btn bg-green-500 text-white h-16 px-12 normal-case font-black text-lg gap-4 shadow-none border-none"
                >
                    <QrCode size={24} />
                    Quick Scan
                </button>
            </div>

            {/* 4. Recent Activity Log */}
            {/* <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 flex items-center gap-2">
                        <History size={14} /> Recent Verifications
                    </h3>
                    <button className="text-[10px] font-black text-green-700 uppercase hover:underline">View History</button>
                </div>

                <div className="divide-y divide-gray-50">
                    {recentScans.length > 0 ? (
                        recentScans.map((scan) => (
                            <ScanItem
                                key={scan.id}
                                id={scan.application_id}
                                farmer={scan.farmer_name}
                                status={scan.status} // 'success' or 'fail'
                                time={scan.time}
                            />
                        ))
                    ) : (
                        <div className="py-20 text-center">
                            <QrCode size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No recent scans recorded</p>
                        </div>
                    )}
                </div>
            </div> */}

        </div>
    );
};

export default InspectorDashboard;