import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
} from 'chart.js';
import { format, subDays } from 'date-fns';
import { Line } from 'react-chartjs-2';

ChartJS.defaults.font.family = "inherit";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
);

const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            beginAtZero: true,
            ticks: { precision: 0 }
        }
    }
};

// eslint-disable-next-line react/prop-types
export default function TaggedProductsChart({ data }) {
    const countsPerDay = {};

    // eslint-disable-next-line react/prop-types
    data.forEach(item => {
        const dateKey = format(new Date(item.createdAt), 'dd-MM-yy');
        countsPerDay[dateKey] = (countsPerDay[dateKey] || 0) + item._count.productId;
    });

    const labels = [];
    const appliedTagsCounts = [];
    for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dateStr = format(d, 'dd-MM-yy');
        labels.push(dateStr);
        appliedTagsCounts.push(countsPerDay[dateStr] || 0);
    }

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Product Update Activity',
                data: appliedTagsCounts,
                backgroundColor: "rgba(255, 99, 132, 0.2)",
                borderColor: "rgb(255, 99, 132)",
                borderWidth: 2,
                tension: 0.4,
                fill: false
            }
        ]
    };

    return (
        <div style={{ width: "100%", height: "350px" }}>
            <Line data={chartData} options={options} />
        </div>
    );
}
