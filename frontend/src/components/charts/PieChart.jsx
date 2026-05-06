import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

/**
 * Minimalist Pie Chart
 * Responsive-first design with bottom legend for mobile compatibility.
 */
const COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#dc2626', '#9333ea', '#0891b2'];

const PieChartComponent = ({
    data = [],
    nameKey = 'status',
    valueKey = 'count',
    height = 400,
}) => {
    return (
        <div className="w-full" style={{ height: height || 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        stroke="none"
                        animationDuration={0} // No fancy animations
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
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
                    />
                    <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ 
                            paddingTop: '20px',
                            fontSize: '10px', 
                            fontWeight: '900', 
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: '#4b5563'
                        }}
                        iconType="rect"
                        iconSize={10}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PieChartComponent;