import Skeleton from 'react-loading-skeleton';
import { useContentLoading } from './loadingContext';
import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

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
    const isLoading = useContentLoading();
    if (status === 'CANCELLED') {
        return (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 shadow-xs">
                <XCircle className="text-red-600 shrink-0" size={20} />
                <div>
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">Application Cancelled</h4>
                    <p className="text-[11px] font-medium text-red-600">This livestock transport request was cancelled and is no longer active.</p>
                </div>
            </div>
        );
    }

    const currentStageIndex = getStageIndex(status);

    return (
        <div className="relative bg-white border border-stone-200 p-5 sm:p-6 space-y-4 rounded-xl shadow-xs">
            {isLoading && <div aria-hidden="true" className="absolute inset-0 z-10 bg-white p-5 sm:p-6 rounded-xl"><Skeleton height="100%" containerClassName="block h-full leading-none" /></div>}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Application Progress</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                    Stage {currentStageIndex + 1} of 7: {STAGES[currentStageIndex]?.title || 'Processing'}
                </span>
            </div>

            {/* Desktop Tracker Stepper with Connecting Bar */}
            <div className="hidden md:grid grid-cols-7 gap-2 relative pt-2">
                {/* Connecting Background Line */}
                <div className="absolute top-[22px] left-[7%] right-[7%] h-[2px] bg-stone-200 -z-0">
                    <div 
                        className="h-full bg-green-700 transition-all duration-500 ease-out"
                        style={{ 
                            width: currentStageIndex <= 0 ? '0%' : `${(currentStageIndex / 6) * 100}%` 
                        }}
                    />
                </div>

                {STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                        <div key={stage.key} className="flex flex-col items-center text-center relative z-10 space-y-2">
                            {/* Step Indicator Badge */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-all duration-200 border
                                ${isCompleted 
                                    ? 'bg-green-700 border-green-700 text-white shadow-2xs' 
                                    : isCurrent 
                                        ? 'bg-amber-500 border-amber-500 text-white shadow-xs ring-2 ring-amber-500/30 ring-offset-2' 
                                        : 'bg-white border-stone-200 text-stone-400'}`}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 size={16} className="animate-in zoom-in-50 duration-200" />
                                ) : (
                                    idx + 1
                                )}
                            </div>

                            {/* Label & Description */}
                            <div className="space-y-0.5">
                                <h4 className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-150 ${
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
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200">
                    <div 
                        className="bg-green-700 h-full rounded-full transition-all duration-400 ease-out"
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
