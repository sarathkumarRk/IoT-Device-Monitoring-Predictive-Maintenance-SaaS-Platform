import { useEffect, useState } from "react";
import { Users as UsersIcon, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "VIEWER",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const response = await API.get("/users/");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await API.post("/users/", form);

      toast.success("User created successfully");
      setForm(initialForm);
      setShowForm(false);
      await fetchUsers();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to create user"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <UsersIcon className="text-orange-500" size={28} />
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View users and create new platform accounts.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setShowForm((previous) => !previous)}
              className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              {showForm ? <X size={17} /> : <Plus size={17} />}
              {showForm ? "Close" : "Create User"}
            </button>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateUser}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Create New User
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="OPERATOR">Operator</option>
                </select>
              </div>
            </div>

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
                disabled={submitting}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Users",
              value: users.length,
            },
            {
              label: "Administrators",
              value: users.filter((user) => user.role === "ADMIN").length,
            },
            {
              label: "Operators",
              value: users.filter((user) => user.role === "OPERATOR").length,
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

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">All Users</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created At</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-orange-50/40">
                      <td className="px-5 py-4">{user.id}</td>
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
