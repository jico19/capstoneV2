const StatusBadge = ({ status }) => {
    // Semantic fills using the bg-*-50 pattern from guidelines where possible
    const statusStyles = {
        SUBMITTED: "bg-blue-50 text-blue-700 border-blue-100",
        OCR_VALIDATED: "bg-purple-50 text-purple-700 border-purple-100",
        FORWARDED_TO_OPV: "bg-amber-50 text-amber-700 border-amber-100",
        OPV_VALIDATED: "bg-green-50 text-green-700 border-green-100",
        RELEASED: "bg-green-50 text-green-700 border-green-100",
        REJECTED: "bg-red-50 text-red-700 border-red-100",
        PAYMENT_PENDING: "bg-yellow-50 text-yellow-700 border-yellow-100",
    };

    return (
        <span className={`px-2 py-1 border rounded-none text-[9px] font-black uppercase tracking-widest inline-block ${statusStyles[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {status?.replace(/_/g, ".")}
        </span>
    );
};

export default StatusBadge;