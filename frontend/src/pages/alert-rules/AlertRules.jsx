import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  X,
  Eye,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const SENSOR_TYPES = [
  "temperature",
  "humidity",
  "vibration",
  "battery_level",
];

const OPERATORS = [">", ">=", "<", "<=", "=="];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const initialForm = {
  name: "",
  device_id: "",
  sensor_type: "temperature",
  operator: ">",
  threshold: "",
  duration_seconds: "0",
  severity: "MEDIUM",
};

const severityStyles = {
  LOW: "bg-blue-100 text-blue-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export default function AlertRules() {
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [selectedRule, setSelectedRule] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [sensorFilter, setSensorFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);

  const limit = 50;

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const isAdmin = currentUser?.role === "ADMIN";

  const fetchRules = async () => {
    setLoading(true);

    try {
      const params = { page, limit };

      if (sensorFilter) {
        params.sensor_type = sensorFilter;
      }

      if (activeFilter !== "") {
        params.is_active = activeFilter === "true";
      }

      const response = await API.get("/alert-rules/", { params });

      setRules(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load alert rules"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await API.get("/devices/", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      setDevices(
        Array.isArray(response.data)
          ? response.data.filter(
              (device) =>
                device.is_active === "ACTIVE" &&
                device.lifecycle_status === "ACTIVE"
            )
          : []
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load devices"
      );
    }
  };

  useEffect(() => {
    fetchRules();
  }, [page, sensorFilter, activeFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchDevices();
    }
  }, []);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateRule = async (event) => {
    event.preventDefault();

    const threshold = Number(form.threshold);
    const duration = Number(form.duration_seconds);

    if (!form.name.trim()) {
      toast.error("Rule name is required");
      return;
    }

    if (form.threshold.trim() === "" || !Number.isFinite(threshold)) {
      toast.error("Enter a valid threshold");
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration < 0
    ) {
      toast.error("Duration must be a non-negative whole number");
      return;
    }

    if (
      ["humidity", "vibration", "battery_level"].includes(form.sensor_type) &&
      threshold < 0
    ) {
      toast.error("Threshold cannot be negative for this sensor");
      return;
    }

    if (
      ["humidity", "battery_level"].includes(form.sensor_type) &&
      threshold > 100
    ) {
      toast.error("Threshold cannot exceed 100 for this sensor");
      return;
    }

    setCreating(true);

    const payload = {
      name: form.name.trim(),
      device_id: form.device_id ? Number(form.device_id) : null,
      sensor_type: form.sensor_type,
      operator: form.operator,
      threshold,
      duration_seconds: duration,
      severity: form.severity,
    };

    try {
      await API.post("/alert-rules/", payload);

      toast.success("Alert rule created successfully");
      setForm(initialForm);
      setShowForm(false);
      await fetchRules();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to create alert rule"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (rule) => {
    const nextStatus = !rule.is_active;
    setUpdatingId(rule.id);

    try {
      await API.patch(`/alert-rules/${rule.id}/status`, null, {
        params: { is_active: nextStatus },
      });

      toast.success(
        nextStatus
          ? "Alert rule activated"
          : "Alert rule deactivated"
      );

      await fetchRules();

      if (selectedRule?.id === rule.id) {
        try {
          const response = await API.get(`/alert-rules/${rule.id}`);
          setSelectedRule(response.data);
        } catch {
          setSelectedRule(null);
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to update alert rule"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const viewRule = async (ruleId) => {
    setDetailsLoading(true);
    setSelectedRule(null);

    try {
      const response = await API.get(`/alert-rules/${ruleId}`);
      setSelectedRule(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load rule details"
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const clearFilters = () => {
    setPage(1);
    setSensorFilter("");
    setActiveFilter("");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <ShieldAlert size={28} className="text-orange-500" />
              Alert Rules
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure sensor thresholds and alert severity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchRules}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowForm((previous) => !previous)}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                {showForm ? <X size={17} /> : <Plus size={17} />}
                {showForm ? "Close" : "Create Rule"}
              </button>
            )}
          </div>
        </div>

        {showForm && isAdmin && (
          <form
            onSubmit={handleCreateRule}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Create Alert Rule
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Rule Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className={inputClass}
                  placeholder="High temperature alert"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Device
                </label>
                <select
                  name="device_id"
                  value={form.device_id}
                  onChange={handleFormChange}
                  className={inputClass}
                >
                  <option value="">Global rule (all devices)</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.device_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Sensor Type *
                </label>
                <select
                  name="sensor_type"
                  value={form.sensor_type}
                  onChange={handleFormChange}
                  className={inputClass}
                >
                  {SENSOR_TYPES.map((sensor) => (
                    <option key={sensor} value={sensor}>
                      {sensor.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Operator *
                </label>
                <select
                  name="operator"
                  value={form.operator}
                  onChange={handleFormChange}
                  className={inputClass}
                >
                  {OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Threshold *
                </label>
                <input
                  type="number"
                  name="threshold"
                  value={form.threshold}
                  onChange={handleFormChange}
                  step="any"
                  className={inputClass}
                  placeholder="Enter threshold"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Duration (seconds) *
                </label>
                <input
                  type="number"
                  name="duration_seconds"
                  value={form.duration_seconds}
                  onChange={handleFormChange}
                  min="0"
                  step="1"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Severity *
                </label>
                <select
                  name="severity"
                  value={form.severity}
                  onChange={handleFormChange}
                  className={inputClass}
                >
                  {SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Global rules have no device ID. They can apply to devices
              according to your backend rule-processing logic.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(initialForm);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Rule"}
              </button>
            </div>
          </form>
        )}

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
          <select
            value={sensorFilter}
            onChange={(event) => {
              setPage(1);
              setSensorFilter(event.target.value);
            }}
            className={inputClass}
            aria-label="Filter by sensor type"
          >
            <option value="">All Sensor Types</option>
            {SENSOR_TYPES.map((sensor) => (
              <option key={sensor} value={sensor}>
                {sensor.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(event) => {
              setPage(1);
              setActiveFilter(event.target.value);
            }}
            className={inputClass}
            aria-label="Filter by active status"
          >
            <option value="">All Rules</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Clear Filters
          </button>

          <p className="text-sm text-gray-500 sm:ml-auto">
            Page {page} · {rules.length} rule(s)
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading alert rules...
            </div>
          ) : rules.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldAlert
                size={36}
                className="mx-auto mb-3 text-gray-300"
              />
              <p className="font-medium text-gray-700">
                No alert rules found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Try changing the filters or create a new rule.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-orange-50/40">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">
                          {rule.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          ID: {rule.id}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {rule.device_id ?? "Global"}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">
                          {rule.sensor_type}
                        </p>
                        <p className="mt-1 text-gray-500">
                          {rule.operator} {rule.threshold}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {rule.duration_seconds} sec
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            severityStyles[rule.severity] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {rule.severity}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            rule.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => viewRule(rule.id)}
                            title="View rule"
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:border-orange-400 hover:text-orange-600"
                          >
                            <Eye size={16} />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(rule)}
                              disabled={updatingId === rule.id}
                              title={
                                rule.is_active
                                  ? "Deactivate rule"
                                  : "Activate rule"
                              }
                              className={`rounded-lg border p-2 disabled:opacity-50 ${
                                rule.is_active
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-green-200 text-green-700 hover:bg-green-50"
                              }`}
                            >
                              {rule.is_active ? (
                                <PowerOff size={16} />
                              ) : (
                                <Power size={16} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-gray-500">Page {page}</span>

            <button
              type="button"
              disabled={loading || rules.length < limit}
              onClick={() => setPage((previous) => previous + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {(selectedRule || detailsLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Alert Rule Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close rule details"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Loading rule details...
              </p>
            ) : (
              <div className="space-y-4">
                {[
                  ["ID", selectedRule.id],
                  ["Name", selectedRule.name],
                  ["Device ID", selectedRule.device_id ?? "Global"],
                  ["Sensor Type", selectedRule.sensor_type],
                  [
                    "Condition",
                    `${selectedRule.operator} ${selectedRule.threshold}`,
                  ],
                  ["Duration (seconds)", selectedRule.duration_seconds],
                  ["Severity", selectedRule.severity],
                  [
                    "Status",
                    selectedRule.is_active ? "Active" : "Inactive",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3"
                  >
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="break-words text-right text-sm font-medium text-gray-900">
                      {value ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}