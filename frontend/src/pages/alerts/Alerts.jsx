import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Eye,
  CheckCircle,
  X,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.alerts)) return data.alerts;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
};

const severityStyle = {
  LOW: "bg-blue-100 text-blue-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const statusStyle = {
  OPEN: "bg-red-100 text-red-700",
  ACKNOWLEDGED: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionId, setActionId] = useState(null);

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [resolveAlertId, setResolveAlertId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const limit = 20;

  let currentUser = null;

  try {
    currentUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    currentUser = null;
  }

  const canTakeAction = ["ADMIN", "OPERATOR"].includes(
    String(currentUser?.role || "").toUpperCase()
  );

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const params = { page, limit };

      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const response = await API.get("/alerts/", { params });

      setAlerts(getList(response.data));
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to load alerts";

      setAlerts([]);
      setLoadError(
        typeof message === "string"
          ? message
          : "Failed to load alerts"
      );

      toast.error(
        typeof message === "string"
          ? message
          : "Failed to load alerts"
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId) => {
    setActionId(alertId);

    try {
      await API.patch(`/alerts/${alertId}/acknowledge`);
      toast.success("Alert acknowledged");
      await fetchAlerts();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to acknowledge alert"
      );
    } finally {
      setActionId(null);
    }
  };

  const openHistory = async (alert) => {
    setSelectedAlert(alert);
    setHistory([]);
    setHistoryLoading(true);

    try {
      const response = await API.get(
        `/alerts/${alert.id}/history`
      );

      setHistory(getList(response.data));
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to load alert history"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleResolve = async (event) => {
    event.preventDefault();

    if (!resolutionNotes.trim()) {
      toast.error("Resolution notes are required");
      return;
    }

    setResolving(true);

    try {
      await API.patch(
        `/alerts/${resolveAlertId}/resolve`,
        {
          resolution_notes: resolutionNotes.trim(),
        }
      );

      toast.success("Alert resolved successfully");
      setResolveAlertId(null);
      setResolutionNotes("");
      setSelectedAlert(null);

      await fetchAlerts();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to resolve alert"
      );
    } finally {
      setResolving(false);
    }
  };

  const resetFilters = () => {
    setPage(1);
    setStatusFilter("");
    setSeverityFilter("");
  };

  const openCount = alerts.filter(
    (alert) => alert.status === "OPEN"
  ).length;

  const acknowledgedCount = alerts.filter(
    (alert) => alert.status === "ACKNOWLEDGED"
  ).length;

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "CRITICAL"
  ).length;

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <AlertTriangle className="text-orange-500" size={28} />
              Alerts
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Monitor alerts and manage their status.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Open</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {openCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Current page
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Acknowledged</p>
            <p className="mt-2 text-2xl font-bold text-orange-600">
              {acknowledgedCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Current page
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Critical</p>
            <p className="mt-2 text-2xl font-bold text-red-700">
              {criticalCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Current page
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(event) => {
              setPage(1);
              setSeverityFilter(event.target.value);
            }}
            className={selectClass}
          >
            <option value="">All severities</option>
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border px-4 py-2.5 text-sm hover:bg-gray-100"
          >
            Clear filters
          </button>

          <p className="text-sm text-gray-500 sm:ml-auto">
            Page {page} · {alerts.length} alert(s) shown
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-gray-500">
              <RefreshCw className="animate-spin" size={20} />
              Loading alerts...
            </div>
          ) : loadError ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <AlertTriangle
                size={36}
                className="mb-3 text-red-500"
              />
              <h2 className="font-semibold text-gray-800">
                Failed to load alerts
              </h2>
              <p className="mt-2 max-w-xl text-sm text-red-600">
                {loadError}
              </p>
              <button
                type="button"
                onClick={fetchAlerts}
                className="mt-5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Retry
              </button>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <AlertTriangle
                size={36}
                className="mb-4 text-gray-300"
              />
              <h2 className="font-semibold text-gray-800">
                No alerts found
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Submit a sensor reading that matches an active alert
                rule, then refresh this page.
              </p>
              <button
                type="button"
                onClick={fetchAlerts}
                className="mt-5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Rule / Message</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">
                          {alert.device?.name ||
                            alert.device_name ||
                            `Device ${alert.device_id ?? "—"}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          ID: {alert.device_id ?? "—"}
                        </p>
                      </td>

                      <td className="max-w-xs px-4 py-4">
                        <p className="font-medium text-gray-800">
                          {alert.rule?.name ||
                            alert.rule_name ||
                            "Alert"}
                        </p>
                        <p className="mt-1 break-words text-gray-500">
                          {alert.message ||
                            alert.description ||
                            "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            severityStyle[alert.severity] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {alert.severity || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusStyle[alert.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {alert.status || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                        {formatDate(
                          alert.created_at || alert.triggered_at
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            title="View history"
                            onClick={() => openHistory(alert)}
                            className="rounded-lg border p-2 hover:bg-gray-100"
                          >
                            <Eye size={16} />
                          </button>

                          {canTakeAction &&
                            alert.status === "OPEN" && (
                              <button
                                type="button"
                                disabled={actionId === alert.id}
                                onClick={() =>
                                  handleAcknowledge(alert.id)
                                }
                                title="Acknowledge"
                                className="rounded-lg border border-green-200 p-2 text-green-700 hover:bg-green-50 disabled:opacity-50"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}

                          {canTakeAction &&
                            alert.status !== "RESOLVED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setResolveAlertId(alert.id);
                                  setResolutionNotes("");
                                }}
                                title="Resolve alert"
                                className="rounded-lg border border-orange-200 p-2 text-orange-700 hover:bg-orange-50"
                              >
                                <CheckCircle size={16} />
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

          <div className="flex items-center justify-between border-t p-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-gray-500">
              Page {page}
            </span>

            <button
              type="button"
              disabled={loading || alerts.length < limit}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {resolveAlertId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleResolve}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Resolve Alert
              </h2>
              <button
                type="button"
                onClick={() => setResolveAlertId(null)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <label className="mb-2 block text-sm font-medium">
              Resolution notes
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(event) =>
                setResolutionNotes(event.target.value)
              }
              required
              rows={4}
              placeholder="Explain how this alert was resolved..."
              className="w-full rounded-lg border p-3 text-sm outline-none focus:border-orange-500"
            />

            <button
              type="submit"
              disabled={resolving}
              className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {resolving ? "Resolving..." : "Confirm Resolve"}
            </button>
          </form>
        </div>
      )}

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Alert History
              </h2>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500">
              {selectedAlert.message ||
                selectedAlert.rule_name ||
                `Alert #${selectedAlert.id}`}
            </p>

            {historyLoading ? (
              <p className="py-6 text-center text-gray-500">
                Loading history...
              </p>
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-gray-500">
                No history records found.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((item, index) => (
                  <div
                    key={item.id ?? index}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Clock size={16} className="text-orange-500" />
                      {item.action ||
                        item.status ||
                        item.event_type ||
                        "Alert update"}
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(
                        item.created_at || item.timestamp
                      )}
                    </p>

                    {item.notes && (
                      <p className="mt-2 text-sm text-gray-700">
                        {item.notes}
                      </p>
                    )}
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