import { useEffect, useState } from "react";
import {
  Bell,
  RefreshCw,
  CheckCheck,
  Check,
  Trash2,
  Filter,
  MailOpen,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const DELIVERY_STATUSES = ["PENDING", "SENT", "FAILED"];
const NOTIFICATION_TYPES = [
  "ALERT",
  "MAINTENANCE",
  "DEVICE",
  "SYSTEM",
];

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [typeFilter, setTypeFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [readFilter, setReadFilter] = useState("");

  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchUnreadCount = async () => {
    try {
      const response = await API.get("/notifications/unread-count");
      setUnreadCount(response.data?.unread_count ?? 0);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to load unread notification count"
      );
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);

    try {
      const params = { page, limit };

      if (typeFilter) {
        params.notification_type = typeFilter;
      }

      if (deliveryFilter) {
        params.delivery_status = deliveryFilter;
      }

      if (readFilter !== "") {
        params.is_read = readFilter === "true";
      }

      const response = await API.get("/notifications/", { params });

      setNotifications(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount(),
    ]);
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, typeFilter, deliveryFilter, readFilter]);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const handleMarkRead = async (notificationId) => {
    setActionId(notificationId);

    try {
      await API.patch(`/notifications/${notificationId}/read`);

      toast.success("Notification marked as read");

      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to mark notification as read"
      );
    } finally {
      setActionId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);

    try {
      const response = await API.patch("/notifications/read-all");

      toast.success(
        response.data?.message || "All notifications marked as read"
      );

      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to mark all notifications as read"
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (notificationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmed) return;

    setActionId(notificationId);

    try {
      await API.delete(`/notifications/${notificationId}`);

      toast.success("Notification deleted");

      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to delete notification"
      );
    } finally {
      setActionId(null);
    }
  };

  const clearFilters = () => {
    setPage(1);
    setTypeFilter("");
    setDeliveryFilter("");
    setReadFilter("");
  };

  const inputClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Bell size={28} className="text-orange-500" />
              Notifications
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage your notifications.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck size={16} />
              {markingAll ? "Updating..." : "Mark All Read"}
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Unread Notifications</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {unreadCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Notifications on This Page</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {notifications.length}
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter size={18} className="text-orange-500" />
            <h2 className="font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <select
              value={typeFilter}
              onChange={(event) => {
                setPage(1);
                setTypeFilter(event.target.value);
              }}
              className={inputClass}
              aria-label="Filter notification type"
            >
              <option value="">All Types</option>
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={deliveryFilter}
              onChange={(event) => {
                setPage(1);
                setDeliveryFilter(event.target.value);
              }}
              className={inputClass}
              aria-label="Filter delivery status"
            >
              <option value="">All Delivery Statuses</option>
              {DELIVERY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={readFilter}
              onChange={(event) => {
                setPage(1);
                setReadFilter(event.target.value);
              }}
              className={inputClass}
              aria-label="Filter read status"
            >
              <option value="">All Read Statuses</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <X size={16} />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Your Notifications
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <Bell
                size={36}
                className="mx-auto mb-3 text-gray-300"
              />
              <p className="font-medium text-gray-700">
                No notifications found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Try changing the filters or refreshing.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex flex-col gap-4 p-5 transition hover:bg-orange-50/40 sm:flex-row sm:items-start ${
                    !notification.is_read ? "bg-orange-50/30" : ""
                  }`}
                >
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      notification.is_read
                        ? "bg-gray-100 text-gray-500"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {notification.is_read ? (
                      <MailOpen size={19} />
                    ) : (
                      <Bell size={19} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {notification.title ||
                          notification.notification_type ||
                          `Notification #${notification.id}`}
                      </h3>

                      {!notification.is_read && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                      {notification.message ||
                        notification.content ||
                        "No message provided"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      {notification.notification_type && (
                        <span className="rounded-md bg-gray-100 px-2 py-1">
                          {notification.notification_type}
                        </span>
                      )}

                      {notification.delivery_status && (
                        <span className="rounded-md bg-gray-100 px-2 py-1">
                          Delivery: {notification.delivery_status}
                        </span>
                      )}

                      <span className="px-1 py-1">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:justify-end">
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification.id)}
                        disabled={actionId === notification.id}
                        title="Mark as read"
                        className="rounded-lg border border-orange-200 p-2 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                      >
                        <Check size={17} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(notification.id)}
                      disabled={actionId === notification.id}
                      title="Delete notification"
                      className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
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
              disabled={loading || notifications.length < limit}
              onClick={() => setPage((previous) => previous + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}