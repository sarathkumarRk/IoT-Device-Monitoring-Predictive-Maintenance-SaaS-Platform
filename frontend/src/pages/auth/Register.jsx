import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await API.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "ADMIN",
      });

      toast.success("Admin registered successfully!");

      setForm({
        name: "",
        email: "",
        password: "",
      });

      navigate("/login");
    } catch (error) {
      const statusCode = error.response?.status;
      const detail = error.response?.data?.detail;

      if (statusCode === 403) {
        toast.error(
          typeof detail === "string"
            ? detail
            : "Admin registration is closed."
        );
      } else {
        toast.error(
          typeof detail === "string"
            ? detail
            : "Admin registration failed."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50/30 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500 text-2xl font-bold text-white">
            I
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Admin Registration
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Create your IoT Monitoring admin account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              autoComplete="name"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email address"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              autoComplete="new-password"
              minLength={3}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Registering Admin..." : "Register as Admin"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-semibold text-orange-600 hover:text-orange-700"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;




