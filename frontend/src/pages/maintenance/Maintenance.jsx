import { useEffect, useState } from "react";
import {
  Wrench,
  Plus,
  RefreshCw,
  X,
  ClipboardList,
  MessageSquare,
  Save,
} from "lucide-react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const initialForm = {
  device_id: "",
  assigned_to: "",
  description: "",
  priority: "MEDIUM",
  due_date: "",
};

const dateOnly = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function Maintenance() {
  const [tasks, setTasks] = useState([]);
  const [devices, setDevices] = useState([]);
  const [operators, setOperators] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [notesTask, setNotesTask] = useState(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const role = (currentUser?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isOperator = role === "OPERATOR";
  const isViewer = role === "VIEWER";

  const fetchTasks = async () => {
    setLoading(true);

    try {
      const response = await API.get("/maintenance-tasks/");
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load maintenance tasks"
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

      setDevices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load devices"
      );
    }
  };

  const fetchOperators = async () => {
    try {
      const response = await API.get("/users/");
      const allUsers = Array.isArray(response.data) ? response.data : [];

      setOperators(
        allUsers.filter(
          (user) => user.role === "OPERATOR" && user.is_active === true
        )
      );
    } catch {
      // Non-admin roles cannot access the admin-only users endpoint.
      setOperators([]);
    }
  };

  useEffect(() => {
    fetchTasks();

    if (isAdmin) {
      fetchDevices();
      fetchOperators();
    }
  }, []);

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      device_id: Number(form.device_id),
      assigned_to: form.assigned_to
        ? Number(form.assigned_to)
        : null,
      description: form.description.trim(),
      priority: form.priority,
      due_date: form.due_date || null,
    };

    try {
      await API.post("/maintenance-tasks/", payload);

      toast.success("Maintenance task created");
      setForm(initialForm);
      setShowCreate(false);
      await fetchTasks();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to create maintenance task"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (task) => {
    setEditingTask(task);

    setEditForm({
      assigned_to:
        task.assigned_to === null || task.assigned_to === undefined
          ? ""
          : String(task.assigned_to),
      description: task.description || "",
      priority: task.priority || "MEDIUM",
      status: task.status || "OPEN",
      due_date: dateOnly(task.due_date),
      completion_details: task.completion_details || "",
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingTask) return;

    const payload = {};

    if (isAdmin) {
      payload.assigned_to = editForm.assigned_to
        ? Number(editForm.assigned_to)
        : null;
      payload.description = editForm.description.trim();
      payload.priority = editForm.priority;
      payload.due_date = editForm.due_date || null;
      payload.status = editForm.status;
      payload.completion_details =
        editForm.completion_details.trim() || null;
    } else if (isOperator) {
      payload.status = editForm.status;
      payload.completion_details =
        editForm.completion_details.trim() || null;
    } else {
      toast.error("You do not have permission to update tasks");
      return;
    }

    setSavingEdit(true);

    try {
      await API.patch(
        `/maintenance-tasks/${editingTask.id}`,
        payload
      );

      toast.success("Maintenance task updated");
      setEditingTask(null);
      await fetchTasks();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to update task"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();

    if (!notesTask || !notes.trim()) {
      toast.error("Please enter a maintenance note");
      return;
    }

    setSavingNotes(true);

    try {
      await API.post(`/maintenance-tasks/${notesTask.id}/notes`, {
        notes: notes.trim(),
      });

      toast.success("Maintenance note added");
      setNotesTask(null);
      setNotes("");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to add maintenance note"
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const filteredTasks = statusFilter
    ? tasks.filter((task) => task.status === statusFilter)
    : tasks;

  const priorityStyle = {
    LOW: "bg-blue-100 text-blue-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };

  const statusStyle = {
    OPEN: "bg-red-100 text-red-700",
    IN_PROGRESS: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  const canEditTask = (task) => {
    if (isAdmin) return true;

    if (isOperator) {
      return (
        task.assigned_to === currentUser?.id &&
        task.status !== "COMPLETED"
      );
    }

    return false;
  };

  const canAddNote = (task) => {
    if (isAdmin) return true;

    return isOperator && task.assigned_to === currentUser?.id;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Wrench size={28} className="text-orange-500" />
              Maintenance
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage device maintenance tasks and completion status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCreate((previous) => !previous)}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                {showCreate ? <X size={17} /> : <Plus size={17} />}
                {showCreate ? "Close" : "Create Task"}
              </button>
            )}
          </div>
        </div>

        {showCreate && isAdmin && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Create Maintenance Task
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Device *
                </label>
                <select
                  name="device_id"
                  value={form.device_id}
                  onChange={handleCreateChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select device</option>
                  {devices.map((device) => (
                    <option
                      key={device.id}
                      value={device.id}
                      disabled={device.is_active !== "ACTIVE"}
                    >
                      {device.name} ({device.device_code}) — {device.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Assign Operator
                </label>
                <select
                  name="assigned_to"
                  value={form.assigned_to}
                  onChange={handleCreateChange}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {operators.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.name} (ID: {operator.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleCreateChange}
                  className={inputClass}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleCreateChange}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleCreateChange}
                  rows={3}
                  className={inputClass}
                  placeholder="Describe the maintenance task..."
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={submitting || devices.length === 0}
                className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        )}

        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Total Tasks",
              value: tasks.length,
            },
            {
              label: "Open",
              value: tasks.filter((task) => task.status === "OPEN").length,
            },
            {
              label: "In Progress",
              value: tasks.filter(
                (task) => task.status === "IN_PROGRESS"
              ).length,
            },
            {
              label: "Completed",
              value: tasks.filter(
                (task) => task.status === "COMPLETED"
              ).length,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} sm:w-56`}
            aria-label="Filter by task status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>

          <p className="text-sm text-gray-500 sm:ml-auto">
            {filteredTasks.length} task(s)
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Loading maintenance tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardList
                size={36}
                className="mx-auto mb-3 text-gray-300"
              />
              <p className="font-medium text-gray-700">
                No maintenance tasks found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Device ID</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-orange-50/40">
                      <td className="max-w-xs px-4 py-4">
                        <p className="font-semibold text-gray-900">
                          Task #{task.id}
                        </p>
                        <p className="mt-1 whitespace-normal text-gray-500">
                          {task.description}
                        </p>
                        {task.completion_details && (
                          <p className="mt-1 text-xs text-green-700">
                            Completion: {task.completion_details}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">{task.device_id}</td>

                      <td className="px-4 py-4">
                        {task.assigned_to ?? "Unassigned"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            priorityStyle[task.priority] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusStyle[task.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {task.status?.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {task.due_date || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {canEditTask(task) && (
                            <button
                              type="button"
                              onClick={() => openEdit(task)}
                              className="rounded-lg bg-orange-100 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-200"
                            >
                              Update
                            </button>
                          )}

                          {canAddNote(task) && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotesTask(task);
                                setNotes("");
                              }}
                              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            >
                              <MessageSquare size={14} />
                              Add Note
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
        </div>
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <form
            onSubmit={handleUpdate}
            className="my-6 w-full max-w-xl rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Update Task #{editingTask.id}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {isAdmin && (
              <>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={3}
                  className={`${inputClass} mb-4`}
                  required
                />

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Assigned Operator
                </label>
                <select
                  name="assigned_to"
                  value={editForm.assigned_to}
                  onChange={handleEditChange}
                  className={`${inputClass} mb-4`}
                >
                  <option value="">Unassigned</option>
                  {operators.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.name} (ID: {operator.id})
                    </option>
                  ))}
                </select>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={editForm.priority}
                      onChange={handleEditChange}
                      className={inputClass}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={editForm.due_date}
                      onChange={handleEditChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}

            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              value={editForm.status}
              onChange={handleEditChange}
              className={`${inputClass} mb-4`}
            >
              {(isOperator
                ? ["IN_PROGRESS", "COMPLETED"]
                : STATUSES
              ).map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>

            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Completion Details
            </label>
            <textarea
              name="completion_details"
              value={editForm.completion_details}
              onChange={handleEditChange}
              rows={3}
              className={inputClass}
              placeholder="Add work completed details..."
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingEdit}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <Save size={16} />
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {notesTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleAddNote}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Add Note — Task #{notesTask.id}
              </h2>
              <button
                type="button"
                onClick={() => setNotesTask(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Maintenance Note *
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              required
              className={inputClass}
              placeholder="Describe the maintenance work or observation..."
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setNotesTask(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNotes || !notes.trim()}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {savingNotes ? "Saving..." : "Add Note"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}