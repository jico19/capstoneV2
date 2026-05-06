/**
 * Formats a date string into a readable format.
 * Follows the project's plain language and minimalist design.
 * 
 * Props:
 *   date — the ISO date string to format
 *   showTime — boolean, if true, includes the time (HH:MM AM/PM)
 *   fallback — text to show if date is null/undefined
 */
const DateFormatter = ({ date, showTime = false, fallback = '—' }) => {
    if (!date) return <span className="text-stone-400">{fallback}</span>

    const d = new Date(date);
    
    // Check if valid date
    if (isNaN(d.getTime())) return <span className="text-stone-400">{fallback}</span>

    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };

    if (showTime) {
        options.hour = 'numeric';
        options.minute = '2-digit';
        options.hour12 = true;
        
        return <span className="font-medium">{d.toLocaleString('en-PH', options)}</span>
    }

    return <span className="font-medium">{d.toLocaleDateString('en-PH', options)}</span>
}

export default DateFormatter;
