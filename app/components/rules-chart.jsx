/* eslint-disable react/prop-types */
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    Title
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.defaults.font.family = "inherit";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    Title
);

const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
        title: {
            display: true,
            text: "Total Products Affected by Rules",
            align: "center",
            font: {
                size: 16,
                weight: "600"
            },
            padding: {
                bottom: 16
            }
        },
        legend: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: (ctx) => `${ctx.raw} products`
            }
        }
    },
    scales: {
        x: {
            beginAtZero: true,
            ticks: { precision: 0 }
        },
        y: {
            ticks: { autoSkip: false }
        }
    }
};

// eslint-disable-next-line react/prop-types
export default function AppliedRulesImpactChart({ data }) {

    const labels = data.map(item => item.ruleName);
    const affectedProducts = data.map(item => item.totalAppliedCount);

    const chartData = {
        labels,
        datasets: [
            {
                label: "Products Affected",
                data: affectedProducts,
                backgroundColor: "rgb(75, 192, 192)",
                borderRadius: 6,
                barThickness: 26
            }
        ]
    };

    return (
        <div style={{ width: "100%", height: "350px" }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}

