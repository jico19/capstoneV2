import { CheckCircle2, AlertTriangle, Info, CreditCard, FilesIcon, FileText, Users, Bell } from "lucide-react";

export const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export const getIconInfo = (type) => {
    switch (type) {
        case 'SUCCESS':
            return {
                icon: CheckCircle2,
                color: 'text-green-700',
                bg: 'bg-green-50',
                border: 'border-green-200',
            };
        case 'WARNING':
            return {
                icon: AlertTriangle,
                color: 'text-amber-700',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
            };
        case 'INFO':
        default:
            return {
                icon: Info,
                color: 'text-sky-700',
                bg: 'bg-sky-50',
                border: 'border-sky-200',
            };
    }
};

export const getSectionInfo = (section) => {
    switch (section) {
        case 'applications':
            return {
                label: 'Permits',
                icon: FilesIcon,
                chipStyle: 'bg-green-50 text-green-700 border-green-200',
            };
        case 'payments':
            return {
                label: 'Payments',
                icon: CreditCard,
                chipStyle: 'bg-stone-100 text-stone-700 border-stone-200',
            };
        case 'surveys':
            return {
                label: 'Hog Surveys',
                icon: FileText,
                chipStyle: 'bg-amber-50 text-amber-700 border-amber-200',
            };
        case 'farmers':
            return {
                label: 'Registries',
                icon: Users,
                chipStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        case 'general':
        default:
            return {
                label: 'General Notice',
                icon: Bell,
                chipStyle: 'bg-stone-100 text-stone-600 border-stone-200',
            };
    }
};