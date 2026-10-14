import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API.post("/auth/login", form);

      localStorage.setItem(
        "access_token",
        response.data.access_token
      );

      const userResponse = await API.get("/auth/me");
      const user = userResponse.data;

      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "ADMIN") {
        toast.success("Welcome Admin! Login successful.");
      } else if (user.role === "OPERATOR") {
        toast.success("Welcome Operator! Login successful.");
      } else if (user.role === "VIEWER") {
        toast.success("Welcome Viewer! Login successful.");
      } else {
        toast.success("Login successful!");
      }

      navigate("/dashboard");
    } catch (error) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      toast.error(
        error.response?.data?.detail || "Login failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500 text-2xl font-bold text-white">
            I
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            IoT Monitoring
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in to monitor your devices and alerts
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
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
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Admin access required to create users?{" "}
          <Link
            to="/register"
            className="font-semibold text-orange-600 hover:text-orange-700"
          >
            Register User
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
