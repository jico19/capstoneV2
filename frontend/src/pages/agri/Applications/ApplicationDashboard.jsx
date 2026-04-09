import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import DateFormatter from "/src/components/DateFormatter";
import ActionGroup from "../../../components/ActionButton";
import StatusBadge from "./StatusBadge";
import { useApplication } from "/src/hooks/useApplications";


const ApplicationDashboard = () => {
    const { data: application, isLoading, isError } = useApplication();
    const navigate = useNavigate();

    if (isLoading) return <div className="p-10 text-center font-bold opacity-50">Loading Applications...</div>;
    if (isError) return <div className="p-10 text-error font-bold">Failed to load data.</div>;



    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-base-300 pb-4">
                <div>
                    <h1 className="text-3xl font-black uppercase text-neutral">Applications</h1>
                    <p className="text-sm opacity-50">Sariaya Municipal Agriculture Office Management </p>
                </div>
            </div>

            {/* Table - No horizontal overflow containers that clip elements */}
            <div className="bg-white border border-base-300">
                <table className="table w-full border-collapse text-center">
                    <thead>
                        <tr className="bg-base-200 text-neutral border-b border-base-300">
                            <th className="font-black uppercase tracking-widest p-4">Application ID</th>
                            <th className="font-black uppercase tracking-widest p-4">Farmer</th>
                            <th className="font-black uppercase tracking-widest p-4">Status</th>
                            <th className="font-black uppercase tracking-widest p-4">Transport Date</th>
                            <th className="font-black uppercase tracking-widest p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {application?.map((data) => (
                            <tr key={data.id} className="border-b border-base-200 hover:bg-base-50 transition-colors">
                                <td className="p-4 font-mono text-xs opacity-60">{data.application_id}</td>
                                <td className="p-4 font-bold text-sm">{data.farmer_name}</td>
                                <td className="p-4"><StatusBadge status={data.status} /></td>
                                <td className="p-4 text-sm"><DateFormatter date={data.transport_date} /></td>
                                <td className="p-4">
                                    {/* Static inline actions: Impossible to overflow because they are part of the row */}
                                    <ActionGroup
                                        buttons={[
                                            { icon: Eye, label: "View", onclick: () => navigate(`detail/${data.id}`), disable: false},
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {application?.length === 0 && (
                    <div className="p-20 text-center opacity-30 italic">No applications found in the registry.</div>
                )}
            </div>
        </div>
    );
};

export default ApplicationDashboard;