import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export const PaymentCountdownTimer = ({ deadline, onExpire, compact = false }) => {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false, formatted: '' });

    useEffect(() => {
        if (!deadline) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const target = new Date(deadline).getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: 'EXPIRED' });
                if (onExpire) onExpire();
                return;
            }

            const hours = Math.floor(difference / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            const formatted = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

            setTimeLeft({ hours, minutes, seconds, isExpired: false, formatted });
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [deadline, onExpire]);

    if (!deadline) return null;

    if (timeLeft.isExpired) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 ${compact ? '' : 'shadow-sm'}`}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                <span>Payment Window Expired</span>
            </div>
        );
    }

    // Color code urgency based on remaining hours
    let colorStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (timeLeft.hours < 1) {
        colorStyle = 'bg-red-50 text-red-800 border-red-300 animate-pulse font-bold';
    } else if (timeLeft.hours < 4) {
        colorStyle = 'bg-amber-50 text-amber-800 border-amber-300';
    }

    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${colorStyle}`}>
                <Clock className="w-3 h-3" />
                <span>{timeLeft.formatted}</span>
            </span>
        );
    }

    return (
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-medium shadow-sm transition-all ${colorStyle}`}>
            <Clock className="w-4 h-4" />
            <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 font-normal">Payment Deadline:</span>
                <span className="font-mono font-bold tracking-tight">{timeLeft.formatted}</span>
            </div>
        </div>
    );
};

export default PaymentCountdownTimer;
