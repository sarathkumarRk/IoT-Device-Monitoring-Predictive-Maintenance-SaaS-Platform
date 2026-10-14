import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import API from "../../api/axios";
import { toast } from "react-toastify";

const ORANGE = "#f97316";

const deviceColors = [
  "#f97316",
  "#9ca3af",
  "#fbbf24",
  "#dc2626",
];

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);

    try {
      const response = await API.get("/dashboard/overview");
      setData(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-600">Loading dashboard...</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard
        </h1>

        <p className="mt-3 text-gray-600">
          Dashboard data could not be loaded.
        </p>

        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Devices",
      value: data.total_devices,
    },
    {
      title: "Online Devices",
      value: data.online_devices,
    },
    {
      title: "Critical Alerts",
      value: data.critical_alerts,
    },
    {
      title: "Maintenance Tasks",
      value: data.open_maintenance_tasks,
    },
  ];

  const deviceChart = [
    { name: "Online", value: data.online_devices },
    { name: "Offline", value: data.offline_devices },
    { name: "Warning", value: data.warning_devices },
    { name: "Critical", value: data.critical_devices },
  ];

  const alertChart = [
    { name: "Open Alerts", value: data.open_alerts },
    { name: "Critical Alerts", value: data.critical_alerts },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            IoT Device Monitoring Overview
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="rounded-lg border border-orange-500 px-4 py-2 font-medium text-orange-600 hover:bg-orange-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">
              {card.title}
            </p>

            <p className="mt-3 text-3xl font-bold text-gray-900">
              {card.value ?? 0}
            </p>

            <div className="mt-3 h-1 w-12 rounded bg-orange-500" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Device Health Distribution
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deviceChart}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label
              >
                {deviceChart.map((device, index) => (
                  <Cell
                    key={device.name}
                    fill={deviceColors[index]}
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Alert Summary
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alertChart}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" />

              <YAxis allowDecimals={false} />

              <Tooltip />

              <Bar
                dataKey="value"
                fill={ORANGE}
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Device Status Summary
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {deviceChart.map((device) => (
            <div
              key={device.name}
              className="rounded-lg border border-gray-200 p-4"
            >
              <p className="text-sm text-gray-500">
                {device.name}
              </p>

              <p className="mt-2 text-xl font-bold text-gray-900">
                {device.value ?? 0}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

