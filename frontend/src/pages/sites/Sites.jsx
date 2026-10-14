import { useEffect, useState } from "react";
import { MapPin, Plus, RefreshCw, X, Eye } from "lucide-react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const initialForm = {
  name: "",
  location: "",
};

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedSite, setSelectedSite] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const isAdmin = currentUser?.role === "ADMIN";

  const fetchSites = async () => {
    setLoading(true);

    try {
      const response = await API.get("/sites/");
      setSites(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load sites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await API.post("/sites/", {
        name: form.name.trim(),
        location: form.location.trim(),
      });

      toast.success("Site created successfully");
      setForm(initialForm);
      setShowForm(false);
      await fetchSites();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create site");
    } finally {
      setSubmitting(false);
    }
  };

  const viewSite = async (siteId) => {
    setDetailsLoading(true);
    setSelectedSite(null);

    try {
      const response = await API.get(`/sites/${siteId}`);
      setSelectedSite(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load site details");
    } finally {
      setDetailsLoading(false);
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
              <MapPin size={28} className="text-orange-500" />
              Site Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage IoT monitoring sites.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchSites}
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
                {showForm ? "Close" : "Create Site"}
              </button>
            )}
          </div>
        </div>

        {showForm && isAdmin && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Create New Site
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Site Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter site name"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Location *
                </label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter site location"
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(initialForm);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Site"}
              </button>
            </div>
          </form>
        )}

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Sites</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {sites.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Your Access</p>
            <p className="mt-2 text-lg font-bold text-orange-600">
              {isAdmin ? "Administrator" : "View Only"}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">All Sites</h2>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Loading sites...
            </p>
          ) : sites.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No sites found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Site Name</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {sites.map((site) => (
                    <tr key={site.id} className="hover:bg-orange-50/40">
                      <td className="px-5 py-4">{site.id}</td>
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {site.name}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {site.location || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => viewSite(site.id)}
                          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-400 hover:text-orange-600"
                        >
                          <Eye size={15} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(selectedSite || detailsLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Site Details
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedSite(null)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close site details"
                >
                  <X size={20} />
                </button>
              </div>

              {detailsLoading ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Loading details...
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500">Site ID</p>
                    <p className="font-medium text-gray-900">
                      {selectedSite.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">
                      {selectedSite.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">
                      {selectedSite.location || "—"}
                    </p>
                  </div>
                  {selectedSite.created_by !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500">Created By</p>
                      <p className="font-medium text-gray-900">
                        {selectedSite.created_by}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}