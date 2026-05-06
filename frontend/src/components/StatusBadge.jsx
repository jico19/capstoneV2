import React from 'react';

/**
 * Global Status Badge Component
 * Strictly adheres to Design.MD: Flat UI, square edges, semantic colors only.
 * 
 * Props:
 *   status — The raw status string from the API (e.g., 'RELEASED', 'PAYMENT_PENDING')
 */
const StatusBadge = ({ status }) => {
    // Mapping API status tokens to Design.MD semantic categories
    // State: Success, Pending, Rejected, In Review, Flagged, Neutral
    const getStatusStyle = (status) => {
        switch (status) {
            // SUCCESS / APPROVED (Green)
            case 'RELEASED':
            case 'PERMIT_ISSUED':
            case 'OPV_VALIDATED':
                return "bg-green-50 text-green-700 border-green-600";
            
            // ACTION REQUIRED / PENDING (Amber)
            case 'PAYMENT_PENDING':
            case 'SUBMITTED':
                return "bg-amber-50 text-amber-700 border-amber-500";
            
            // REJECTED / ERROR (Red)
            case 'OPV_REJECTED':
            case 'RESUBMISSION':
                return "bg-red-50 text-red-700 border-red-600";
            
            // IN PROGRESS / SYSTEM REVIEW (Sky)
            case 'FORWARDED_TO_OPV':
            case 'OCR_VALIDATED':
                return "bg-sky-50 text-sky-700 border-sky-600";
            
            // FLAG / MANUAL ATTENTION (Orange)
            case 'MANUAL':
                return "bg-orange-50 text-orange-700 border-orange-500";
            
            // NEUTRAL / INITIAL (Stone)
            case 'DRAFT':
            default:
                return "bg-stone-50 text-stone-600 border-stone-200";
        }
    };

    // Helper to format status text for humans (e.g., PAYMENT_PENDING -> PAYMENT PENDING)
    const formatStatus = (text) => {
        if (!text) return "UNKNOWN";
        
        // Custom labels for better UX based on role-agnostic plain language
        const labels = {
            'DRAFT': 'Draft',
            'SUBMITTED': 'Sent',
            'RESUBMISSION': 'Needs Update',
            'OCR_VALIDATED': 'Auto Checked',
            'MANUAL': 'Needs Review',
            'FORWARDED_TO_OPV': 'OPV Review',
            'OPV_VALIDATED': 'OPV Approved',
            'OPV_REJECTED': 'OPV Rejected',
            'PERMIT_ISSUED': 'Permit Ready',
            'PAYMENT_PENDING': 'Awaiting Payment',
            'RELEASED': 'Released'
        };

        return labels[text] || text.replace(/_/g, " ");
    };

    return (
        <span className={`
            px-2 py-0.5 border rounded-none 
            text-[10px] font-black uppercase tracking-widest inline-block whitespace-nowrap
            ${getStatusStyle(status)}
        `}>
            {formatStatus(status)}
        </span>
    );
};

export default StatusBadge;