// components/DateFormatter.jsx
const DateFormatter = ({ date, fallback = '—' }) => {
    if (!date) return <span>{fallback}</span>

    const formatted = new Date(date).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return <span>{formatted}</span>
}

export default DateFormatter