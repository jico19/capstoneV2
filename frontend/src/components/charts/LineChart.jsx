import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

/**
 * Minimalist Line Chart
 * Designed for responsiveness and strict alignment with the white/green system.
 */
const LineChartComponent = ({
    data = [],
    xKey = 'date',
    yKey = 'count',
    height = 350,
    lineColor = '#16a34a', // Primary Green (green-600)
    showGrid = true
}) => {

    // Simple date formatter for the axis
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Compact number formatter
    const formatNumber = (num) => {
        if (typeof num !== 'number') return num;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toLocaleString();
    };

    return (
        <div className="w-full" style={{ height: height || 350 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                >
                    {showGrid && (
                        <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="#f3f4f6" />
                    )}

                    <XAxis
                        dataKey={xKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: '900' }}
                        tickFormatter={formatDate}
                        minTickGap={40}
                        dy={10}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: '900' }}
                        tickFormatter={formatNumber}
                        width={40}
                    />

                    <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke={lineColor}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={0} // No fancy animations as per DesignSys.MD
                    />

                    <Tooltip
                        labelFormatter={formatDate}
                        cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                        contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #f3f4f6',
                            borderRadius: '0px',
                            padding: '12px',
                            boxShadow: 'none'
                        }}
                        itemStyle={{ 
                            color: '#111827', 
                            fontSize: '12px', 
                            fontWeight: '900',
                            textTransform: 'uppercase'
                        }}
                        labelStyle={{
                            color: '#9ca3af',
                            fontSize: '10px',
                            fontWeight: '900',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LineChartComponent;