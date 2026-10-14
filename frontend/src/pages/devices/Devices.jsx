
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import API from "../../api/axios";

const initialForm = {
  device_code: "",
  name: "",
  device_type: "",
  location: "",
  site_id: "",
  installation_date: "",
  temperature_min: "0",
  temperature_max: "50",
  humidity_min: "0",
  humidity_max: "100",
  vibration_max: "10",
  reporting_interval: "60",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

function Devices() {
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("");
  const [page, setPage] = useState(1);

  const [form, setForm] = useState(initialForm);

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const limit = 10;

  const fetchDevices = async () => {
    setLoading(true);

    try {
      const params = {
        page,
        limit,
        sort_by: "id",
        sort_order: "desc",
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (deviceStatus) {
        params.device_status = deviceStatus;
      }

      const response = await API.get("/devices/", { params });

      setDevices(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load devices"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await API.get("/sites/");
      setSites(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load sites"
      );
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [page, deviceStatus]);

  useEffect(() => {
    if (showForm && isAdmin) {
      fetchSites();
    }
  }, [showForm]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchDevices();
  };

  const handleReset = () => {
    setSearch("");
    setDeviceStatus("");
    setPage(1);
  };

  const handleFormChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreateDevice = async (event) => {
    event.preventDefault();

    if (!form.site_id) {
      toast.error("Please create and select a site first.");
      return;
    }

    if (
      Number(form.temperature_min) >=
      Number(form.temperature_max)
    ) {
      toast.error("Minimum temperature must be less than maximum.");
      return;
    }

    if (
      Number(form.humidity_min) >=
      Number(form.humidity_max)
    ) {
      toast.error("Minimum humidity must be less than maximum.");
      return;
    }

    if (
      Number(form.vibration_max) <= 0 ||
      Number(form.reporting_interval) <= 0
    ) {
      toast.error(
        "Vibration and reporting interval must be greater than zero."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        device_code: form.device_code.trim(),
        name: form.name.trim(),
        device_type: form.device_type.trim(),
        location: form.location.trim() || null,
        site_id: Number(form.site_id),
        installation_date: form.installation_date,
        temperature_min: Number(form.temperature_min),
        temperature_max: Number(form.temperature_max),
        humidity_min: Number(form.humidity_min),
        humidity_max: Number(form.humidity_max),
        vibration_max: Number(form.vibration_max),
        reporting_interval: Number(form.reporting_interval),
      };

      await API.post("/devices/", payload);

      toast.success("Device created successfully!");

      setForm(initialForm);
      setShowForm(false);
      setSearch("");
      setDeviceStatus("");
      setPage(1);

      // Reload the first page after creating the device.
      const response = await API.get("/devices/", {
        params: {
          page: 1,
          limit,
          sort_by: "id",
          sort_order: "desc",
        },
      });

      setDevices(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to create device"
      );
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status) => {
    if (status === "ONLINE") {
      return "bg-orange-100 text-orange-700";
    }

    if (status === "CRITICAL") {
      return "bg-red-100 text-red-700";
    }

    if (status === "WARNING") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  const formatDate = (value) => {
    if (!value) return "Never";
    return new Date(value).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Devices
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage registered IoT devices.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchDevices}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-medium text-white hover:bg-orange-600"
            >
              <Plus size={18} />
              Add Device
            </button>
          )}
        </div>
      </div>

      {showForm && isAdmin && (
        <div className="mb-6 rounded-xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Device
            </h2>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateDevice}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Device Code
                </label>
                <input
                  name="device_code"
                  value={form.device_code}
                  onChange={handleFormChange}
                  placeholder="DEV-002"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Device Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Temperature Sensor"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Device Type
                </label>
                <input
                  name="device_type"
                  value={form.device_type}
                  onChange={handleFormChange}
                  placeholder="Temperature Sensor"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Location
                </label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  placeholder="Factory Floor A"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Site
                </label>
                <select
                  name="site_id"
                  value={form.site_id}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                >
                  <option value="">Select Site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>

                {sites.length === 0 && (
                  <p className="mt-1 text-xs text-orange-600">
                    Create a site before adding a device.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Installation Date
                </label>
                <input
                  type="date"
                  name="installation_date"
                  value={form.installation_date}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Minimum Temperature
                </label>
                <input
                  type="number"
                  step="any"
                  name="temperature_min"
                  value={form.temperature_min}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Maximum Temperature
                </label>
                <input
                  type="number"
                  step="any"
                  name="temperature_max"
                  value={form.temperature_max}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Minimum Humidity
                </label>
                <input
                  type="number"
                  step="any"
                  name="humidity_min"
                  value={form.humidity_min}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Maximum Humidity
                </label>
                <input
                  type="number"
                  step="any"
                  name="humidity_max"
                  value={form.humidity_max}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Maximum Vibration
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  name="vibration_max"
                  value={form.vibration_max}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Reporting Interval (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  name="reporting_interval"
                  value={form.reporting_interval}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving || sites.length === 0}
                className="rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Device"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, code, type or location"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />

          <select
            value={deviceStatus}
            onChange={(event) => {
              setDeviceStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-5 py-3 font-medium text-white hover:bg-orange-600"
          >
            <Search size={16} className="mr-1 inline" />
            Search
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-gray-700">
              No devices found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Add a device or change your search and status filter.
            </p>

            <button
              type="button"
              onClick={fetchDevices}
              className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Device</th>
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Location</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Lifecycle</th>
                    <th className="px-5 py-4 font-semibold">Last Seen</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {devices.map((device) => (
                    <tr
                      key={device.id}
                      className="hover:bg-orange-50/40"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/devices/${device.id}`)
                          }
                          className="text-left font-semibold text-gray-900 hover:text-orange-600"
                        >
                          {device.name}
                        </button>

                        <p className="mt-1 text-xs text-gray-500">
                          {device.device_code}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {device.device_type}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {device.location || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(device.status)}`}
                        >
                          {device.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {device.lifecycle_status}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(device.last_seen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
              <span className="text-sm text-gray-500">
                Page {page}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (devices.length === limit) {
                      setPage((current) => current + 1);
                    }
                  }}
                  disabled={devices.length < limit}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Devices;


