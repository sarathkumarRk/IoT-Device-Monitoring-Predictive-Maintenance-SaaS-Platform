
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Thermometer,
  Droplets,
  Gauge,
  Battery,
  CalendarDays,
  MapPin,
  Cpu,
  AlertCircle,
  Plus,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "react-toastify";
import API from "../../api/axios";

const inputClass =
  "w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const formatValue = (value, suffix = "") =>
  value === null || value === undefined ? "—" : `${value}${suffix}`;

const statusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (value === "ONLINE" || value === "ACTIVE")
    return "bg-green-100 text-green-700";

  if (value === "WARNING")
    return "bg-yellow-100 text-yellow-700";

  if (value === "CRITICAL" || value === "OFFLINE")
    return "bg-red-100 text-red-700";

  return "bg-gray-100 text-gray-700";
};

function StatCard({ title, value, unit, icon: Icon }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatValue(value, unit)}
          </p>
        </div>
        <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-gray-800">
          {value === null || value === undefined || value === ""
            ? "—"
            : String(value)}
        </p>
      </div>
    </div>
  );
}

function DeviceDetails() {
  const { deviceId } = useParams();

  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const [showReadingForm, setShowReadingForm] = useState(false);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [readingForm, setReadingForm] = useState({
    temperature: "28.5",
    humidity: "65",
    vibration: "2.5",
    battery_level: "90",
  });

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const role = String(storedUser?.role || "").toUpperCase();
  const canAddReading = ["ADMIN", "OPERATOR"].includes(role);

  const loadDevice = useCallback(async () => {
    const response = await API.get(`/devices/${deviceId}`);
    setDevice(response.data);
  }, [deviceId]);

  const loadReadings = useCallback(
    async (from = "", to = "") => {
      setReadingsLoading(true);

      try {
        const params = { page: 1, limit: 100 };

        if (from) params.from = new Date(from).toISOString();
        if (to) params.to = new Date(to).toISOString();

        const response = await API.get(
          `/devices/${deviceId}/readings`,
          { params }
        );

        setReadings(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (err) {
        toast.error(
          err.response?.data?.detail ||
            "Unable to load sensor readings."
        );
        setReadings([]);
      } finally {
        setReadingsLoading(false);
      }
    },
    [deviceId]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadDevice(), loadReadings()]);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to load device details.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [loadDevice, loadReadings]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddReading = async (event) => {
    event.preventDefault();

    if (!canAddReading) {
      toast.error("Only Admin and Operator can add readings.");
      return;
    }

    setSavingReading(true);

    try {
      await API.post(`/devices/${deviceId}/readings`, {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        temperature: Number(readingForm.temperature),
        humidity: Number(readingForm.humidity),
        vibration: Number(readingForm.vibration),
        battery_level: Number(readingForm.battery_level),
      });

      toast.success("Sensor reading added successfully!");
      setShowReadingForm(false);

      await Promise.all([
        loadDevice(),
        loadReadings(fromDate, toDate),
      ]);
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Failed to add sensor reading."
      );
    } finally {
      setSavingReading(false);
    }
  };

  const handleFilter = async (event) => {
    event.preventDefault();

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      toast.error("From date cannot be later than To date.");
      return;
    }

    await loadReadings(fromDate, toDate);
  };

  const handleReset = async () => {
    setFromDate("");
    setToDate("");
    await loadReadings();
  };

  const chartData = [...readings].reverse().map((reading) => ({
    ...reading,
    chartTime: reading.timestamp
      ? new Date(reading.timestamp).toLocaleString()
      : "—",
  }));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto text-red-500" size={36} />
        <h2 className="mt-3 font-bold">Unable to load device</h2>
        <p className="mt-2 text-sm text-gray-500">
          {error || "Device not found."}
        </p>
        <button
          type="button"
          onClick={loadAll}
          className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-white"
        >
          Try again
        </button>
        <Link to="/devices" className="ml-3 text-orange-600">
          Back to devices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            to="/devices"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-orange-600"
          >
            <ArrowLeft size={16} />
            Back to devices
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {device.name || "Device Details"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Device code: {device.device_code || "—"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {canAddReading && (
            <button
              type="button"
              onClick={() => setShowReadingForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <Plus size={16} />
              Add Test Reading
            </button>
          )}
        </div>
      </div>

      {showReadingForm && (
        <section className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">
              Add Sensor Reading
            </h2>
            <button
              type="button"
              onClick={() => setShowReadingForm(false)}
              className="text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleAddReading}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {[
              {
                name: "temperature",
                label: "Temperature (°C)",
                min: device.temperature_min ?? undefined,
                max: device.temperature_max ?? undefined,
              },
              {
                name: "humidity",
                label: "Humidity (%)",
                min: 0,
                max: 100,
              },
              {
                name: "vibration",
                label: "Vibration",
                min: 0,
                max: device.vibration_max ?? undefined,
              },
              {
                name: "battery_level",
                label: "Battery Level (%)",
                min: 0,
                max: 100,
              },
            ].map((field) => (
              <label
                key={field.name}
                className="text-sm font-medium text-gray-700"
              >
                {field.label}
                <input
                  type="number"
                  step="any"
                  required
                  min={field.min}
                  max={field.max}
                  value={readingForm[field.name]}
                  onChange={(event) =>
                    setReadingForm({
                      ...readingForm,
                      [field.name]: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-2`}
                />
              </label>
            ))}

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={savingReading}
                className="rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {savingReading ? "Saving..." : "Save Reading"}
              </button>
              <button
                type="button"
                onClick={() => setShowReadingForm(false)}
                className="rounded-lg border px-5 py-2.5"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
              <Cpu size={24} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">
                Device Information
              </h2>
              <p className="text-sm text-gray-500">
                Configuration and current status
              </p>
            </div>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass(device.status)}`}
          >
            {device.status || "UNKNOWN"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={Cpu} label="Device Type" value={device.device_type} />
          <InfoItem icon={MapPin} label="Location" value={device.location} />
          <InfoItem icon={Activity} label="Site ID" value={device.site_id} />
          <InfoItem icon={Activity} label="Lifecycle Status" value={device.lifecycle_status} />
          <InfoItem icon={CalendarDays} label="Installation Date" value={device.installation_date} />
          <InfoItem icon={CalendarDays} label="Last Seen" value={formatDate(device.last_seen)} />
          <InfoItem
            icon={Thermometer}
            label="Temperature Range"
            value={`${formatValue(device.temperature_min)} to ${formatValue(device.temperature_max)} °C`}
          />
          <InfoItem
            icon={Droplets}
            label="Humidity Range"
            value={`${formatValue(device.humidity_min)} to ${formatValue(device.humidity_max)} %`}
          />
          <InfoItem icon={Gauge} label="Maximum Vibration" value={device.vibration_max} />
          <InfoItem
            icon={Activity}
            label="Reporting Interval"
            value={formatValue(device.reporting_interval, " seconds")}
          />
          <InfoItem icon={CalendarDays} label="Created At" value={formatDate(device.created_at)} />
        </div>

        {device.document_url && (
          <div className="mt-5 border-t pt-4">
            <a
              href={device.document_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-orange-600 hover:underline"
            >
              View device document
            </a>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Sensor Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Latest available reading from this device
          </p>
        </div>

        {readings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Temperature" value={readings[0].temperature} unit=" °C" icon={Thermometer} />
            <StatCard title="Humidity" value={readings[0].humidity} unit=" %" icon={Droplets} />
            <StatCard title="Vibration" value={readings[0].vibration} icon={Gauge} />
            <StatCard title="Battery Level" value={readings[0].battery_level} unit=" %" icon={Battery} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-orange-200 bg-white p-8 text-center">
            <Activity className="mx-auto text-orange-400" size={32} />
            <p className="mt-3 font-semibold text-gray-800">
              No sensor readings found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {canAddReading
                ? "Click Add Test Reading to submit sample sensor data."
                : "No readings have been submitted for this device."}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-900">Sensor History</h2>
        <p className="mt-1 text-sm text-gray-500">
          Historical temperature, humidity, vibration and battery readings
        </p>

        {readingsLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-gray-500">
            <RefreshCw className="animate-spin text-orange-500" size={20} />
            Loading readings...
          </div>
        ) : readings.length > 0 ? (
          <div className="mt-5 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="chartTime"
                  angle={-25}
                  textAnchor="end"
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Line type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vibration" name="Vibration" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="battery_level" name="Battery (%)" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-gray-500">
            No readings available to plot.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-900">Filter Sensor Readings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose a date and time range to filter the history.
        </p>

        <form
          onSubmit={handleFilter}
          className="mt-4 grid grid-cols-1 items-end gap-4 md:grid-cols-3"
        >
          <label className="text-sm font-medium text-gray-700">
            From
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            To
            <input
              type="datetime-local"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className={`${inputClass} mt-2`}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={readingsLoading}
              className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={readingsLoading}
              className="rounded-lg border px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-gray-900">Sensor Readings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Showing {readings.length} readings
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadReadings(fromDate, toDate)}
            disabled={readingsLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-sm text-orange-600 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Refresh readings
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left text-sm">
            <thead className="bg-orange-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-5 py-3">Event ID</th>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Temperature</th>
                <th className="px-5 py-3">Humidity</th>
                <th className="px-5 py-3">Vibration</th>
                <th className="px-5 py-3">Battery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {readings.map((reading) => (
                <tr
                  key={reading.id ?? reading.event_id}
                  className="hover:bg-orange-50/50"
                >
                  <td className="px-5 py-4">{reading.event_id || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                    {formatDate(reading.timestamp)}
                  </td>
                  <td className="px-5 py-4">{formatValue(reading.temperature, " °C")}</td>
                  <td className="px-5 py-4">{formatValue(reading.humidity, " %")}</td>
                  <td className="px-5 py-4">{formatValue(reading.vibration)}</td>
                  <td className="px-5 py-4">{formatValue(reading.battery_level, " %")}</td>
                </tr>
              ))}

              {readings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                    No readings match the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DeviceDetails;


