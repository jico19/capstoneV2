import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const LineChartComponent = ({
    data = [],
    xKey = 'date',
    yKey = 'avg',
    height = 300,
    lineColor = '#16a34a', // Tailwind green-600
    showGrid = true
}) => {

    // Helper function for dates: "April 15, 2026"
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Helper function for numbers: 2 decimal places (e.g., 42.67)
    const formatNumber = (num) => {
        if (typeof num !== 'number') return num;
        return num.toFixed(2);
    };

    return (
        // Added `w-full` and `min-w-0` to guarantee Recharts doesn't overflow mobile containers
        <div className="w-full min-w-0 relative" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    // Reduced left margin so the Y-axis doesn't waste space on small screens
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    {showGrid && (
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    )}

                    <XAxis
                        dataKey={xKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                        // dy={-5}
                        tickFormatter={formatDate}
                        minTickGap={30}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                        // dx={-10}
                        width={60} // Slightly wider to ensure numbers aren't cut off on desktop
                        tickFormatter={formatNumber}
                    />

                    <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke={lineColor}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#fff', stroke: lineColor, strokeWidth: 2 }}
                    />

                    <Tooltip
                        labelFormatter={formatDate}
                        formatter={(value) => [formatNumber(value), 'Average']}
                        // Tailwind-style dark theme applied directly to the default Tooltip
                        contentStyle={{
                            backgroundColor: '#111827', // gray-900
                            border: 'none',
                            borderRadius: '0px', // Flat UI aesthetic
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '900',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        itemStyle={{ color: '#ffffff' }}
                        labelStyle={{
                            color: '#9ca3af',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            fontSize: '10px',
                            letterSpacing: '0.05em'
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LineChartComponent;