

const StatusBadge = ({ status }) => {
    const statusStyles = {
        SUBMITTED: "bg-blue-200 text-blue-800",
        OCR_VALIDATED: "bg-purple-200 text-purple-800",
        FORWARDED_TO_OPV: "bg-orange-200 text-orange-800",
        OPV_VALIDATED: "bg-cyan-200 text-cyan-800",
        RELEASED: "bg-green-200 text-green-800",
        REJECTED: "bg-red-200 text-red-800",
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
};

export default StatusBadge