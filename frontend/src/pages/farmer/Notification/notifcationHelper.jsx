import { CheckCircle2, AlertTriangle, Info } from "lucide-react";



export const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getIconInfo = (type) => {
    switch (type) {
        case 'SUCCESS': return { icon: CheckCircle2, color: 'text-green-600' };
        case 'WARNING': return { icon: AlertTriangle, color: 'text-amber-600' };
        case 'INFO':
        default: return { icon: Info, color: 'text-sky-600' };
    }
};