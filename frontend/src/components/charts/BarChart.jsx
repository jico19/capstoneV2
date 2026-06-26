import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

/**
 * Flat Bar Chart
 * Strictly follows GEMINI.md: Primary Green or Semantic Colors, no plain black.
 * Sharp corners, no shadows, no radius.
 */
const COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#dc2626', '#9333ea'];

const BarChartComponent = ({
    data = [],
    xKey = 'date',
    yKey = 'count',
    height = 300,
    barColor = '#16a34a', // Default to Primary Green
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return "";
        
        // If it's a string, ensure it has a date-like pattern (contains a dash/slash)
        // to prevent JS from parsing things like "Barangay 5" as dates.
        if (typeof dateString === 'string' && !dateString.includes('-') && !dateString.includes('/')) {
            return dateString;
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        // Format year-month (e.g. "2026-06") as "MMM YYYY"
        if (typeof dateString === 'string' && dateString.length === 7 && dateString.includes('-')) {
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="w-full min-w-0 rounded-none" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey={xKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: '900' }}
                        tickFormatter={formatDate}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: '900' }}
                    />
                    <Tooltip
                        labelFormatter={formatDate}
                        contentStyle={{
                            backgroundColor: '#111827',
                            border: 'none',
                            borderRadius: '0px',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '900',
                            boxShadow: 'none'
                        }}
                        itemStyle={{ color: '#ffffff', padding: '0px' }}
                        labelStyle={{
                            color: '#9ca3af',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}
                    />
                    <Bar dataKey={yKey} fill={barColor} radius={0}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BarChartComponent;