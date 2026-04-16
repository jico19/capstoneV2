import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

/**
 * Flat Pie Chart
 * Strictly follows GEMINI.md: no black segments, Primary Green and Semantic colors.
 * Sharp segments, no shadows.
 */
const COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#dc2626', '#9333ea', '#0891b2'];

const PieChartComponent = ({
    data = [],
    nameKey = 'status',
    valueKey = 'count',
    height = 300,
}) => {
    return (
        <div className="w-full min-w-0 rounded-none" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#111827',
                            border: 'none',
                            borderRadius: '0px',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '900',
                            boxShadow: 'none'
                        }}
                    />
                    <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ 
                            fontSize: '9px', 
                            fontWeight: '900', 
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}
                        iconType="rect"
                        iconSize={8}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PieChartComponent;