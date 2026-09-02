import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const parseValidationError = (err, fallback = "Action failed.") => {
    if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
            if (data.detail) return data.detail;
            const fieldErrors = Object.entries(data)
                .map(([field, errors]) => {
                    const fieldLabel = field.replace('_', ' ');
                    const errorMsg = Array.isArray(errors) ? errors[0] : errors;
                    return `${fieldLabel}: ${errorMsg}`;
                })
                .join(' | ');
            if (fieldErrors) return fieldErrors;
        } else if (typeof data === 'string') {
            return data;
        }
    }
    return err.message || fallback;
};

/**
 * Extracts a user-facing error message from an axios error.
 * Checks userMessage (set by interceptor), then parseValidationError, then fallback.
 */
export const getErrorMessage = (error, fallback = 'Something went wrong.') => {
    if (error?.userMessage) return error.userMessage;
    return parseValidationError(error, fallback);
};

export const downloadBlob = (data, fileName) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const isFile = (val) => {
    if (!val) return false;
    if (typeof FileList !== 'undefined' && val instanceof FileList) {
        return val.length > 0;
    }
    if (Array.isArray(val)) {
        return val.length > 0 && val[0] instanceof File;
    }
    if (typeof File !== 'undefined' && val instanceof File) {
        return true;
    }
    if (val.length && val[0] instanceof File) {
        return true;
    }
    return false;
};

export const getFileObject = (val) => {
    if (!val) return null;
    if (typeof FileList !== 'undefined' && val instanceof FileList) {
        return val[0];
    }
    if (Array.isArray(val)) {
        return val[0];
    }
    return val;
};

export const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown Date';
    
    if (options.dateOnly) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    if (options.chartFormat) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    }) + ' at ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: options.showSeconds ? '2-digit' : undefined
    });
};

export const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        return `${mins} min${mins > 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 86400) {
        const hrs = Math.floor(diffInSeconds / 3600);
        return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    }
    const diffDays = Math.floor(diffInSeconds / 86400);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
