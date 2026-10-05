import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, Circle } from 'lucide-react';

/**
 * Reusable Application Stage Progress Tracker
 * Follows Minimalist LGU Design System: square edges, sharp borders, stone neutral colors.
 */
const STAGES = [
    { key: 'SUBMITTED', title: 'Submitted', desc: 'Received in system' },
    { key: 'MAO_REVIEW', title: 'MAO Review', desc: 'Doc verification' },
    { key: 'OPV_REVIEW', title: 'OPV Review', desc: 'Shipping Permit review' },
    { key: 'OPV_APPROVED', title: 'OPV Approved', desc: 'Health cleared' },
    { key: 'PERMIT_CREATION', title: 'Permit Creation', desc: 'Fee assignment' },
    { key: 'PAYMENT', title: 'Payment', desc: 'Fee checkout' },
    { key: 'COMPLETED', title: 'Completed', desc: 'Permit released' }
];

const getStageIndex = (status) => {
    switch (status) {
        case 'DRAFT':
        case 'SUBMITTED':
            return 0; // Submitted
        case 'OCR_VALIDATED':
        case 'MANUAL':
        case 'RESUBMISSION':
            return 1; // MAO Review
        case 'FORWARDED_TO_OPV':
        case 'OPV_REJECTED':
            return 2; // OPV Review
        case 'OPV_VALIDATED':
            return 3; // OPV Approved
        case 'PERMIT_ISSUED':
            return 4; // Permit Creation
        case 'PAYMENT_PENDING':
            return 5; // Payment
        case 'PAID':
        case 'RELEASED':
            return 6; // Completed
        case 'CANCELLED':
            return -1;
        default:
            return 0;
    }
};

const ApplicationTracker = ({ status }) => {
    if (status === 'CANCELLED') {
        return (
            <div className="bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                <XCircle className="text-red-600 shrink-0" size={20} />
                <div>
                    <h4 className="text-xs font-black text-red-700 uppercase tracking-widest">Application Cancelled</h4>
                    <p className="text-[11px] font-medium text-red-600">This livestock transport request was cancelled and is no longer active.</p>
                </div>
            </div>
        );
    }

    const currentStageIndex = getStageIndex(status);

    return (
        <div className="bg-white border border-stone-200 p-5 sm:p-6 space-y-4 rounded-none">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Application Progress</span>
                <span className="text-xs font-black uppercase tracking-wider text-green-800 bg-green-50 px-2.5 py-1 border border-green-200">
                    Stage {currentStageIndex + 1} of 7: {STAGES[currentStageIndex]?.title || 'Processing'}
                </span>
            </div>

            {/* Desktop Tracker Stepper */}
            <div className="hidden md:grid grid-cols-7 gap-2 relative pt-2">
                {STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                        <div key={stage.key} className="flex flex-col items-center text-center relative z-10 space-y-2">
                            {/* Step Indicator Badge */}
                            <div className={`w-8 h-8 flex items-center justify-center font-black text-xs transition-colors border
                                ${isCompleted 
                                    ? 'bg-green-700 border-green-700 text-white' 
                                    : isCurrent 
                                        ? 'bg-amber-500 border-amber-500 text-white animate-pulse' 
                                        : 'bg-stone-50 border-stone-200 text-stone-400'}`}
                            >
                                {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                            </div>

                            {/* Label & Description */}
                            <div className="space-y-0.5">
                                <h4 className={`text-[10px] font-black uppercase tracking-wider ${
                                    isCurrent ? 'text-amber-700 font-extrabold' : isCompleted ? 'text-green-800 font-bold' : 'text-stone-400'
                                }`}>
                                    {stage.title}
                                </h4>
                                <p className="text-[9px] font-medium text-stone-400 leading-tight hidden lg:block">
                                    {stage.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile Compact Progress Bar */}
            <div className="md:hidden space-y-2">
                <div className="w-full bg-stone-100 h-2 overflow-hidden">
                    <div 
                        className="bg-green-700 h-full transition-all duration-300"
                        style={{ width: `${((currentStageIndex + 1) / 7) * 100}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-stone-500">
                    <span>Submitted</span>
                    <span className="text-green-800 font-bold">{STAGES[currentStageIndex]?.title}</span>
                    <span>Completed</span>
                </div>
            </div>
        </div>
    );
};

export default ApplicationTracker;
