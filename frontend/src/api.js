const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000")
  .replace(/\/+$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Could not connect to ApplyWise. Make sure the backend is running.",
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      // Keep the HTTP status message when the server did not return JSON.
    }
    throw new Error(
      Array.isArray(message)
        ? message.map((item) => item.msg).join(", ")
        : message,
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  listApplications: () => request("/applications"),
  createApplication: (application) =>
    request("/applications", {
      method: "POST",
      body: JSON.stringify(application),
    }),
  updateStatus: (id, status) =>
    request(`/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteApplication: (id) =>
    request(`/applications/${id}`, { method: "DELETE" }),
  analyze: (jobDescription) =>
    request("/analyze", {
      method: "POST",
      body: JSON.stringify({ job_description: jobDescription }),
    }),
};
