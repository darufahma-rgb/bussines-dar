const BASE = "/api";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    signIn: (email: string, password: string) =>
      request("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) }),
    signUp: (email: string, password: string) =>
      request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
    signOut: () => request("/auth/signout", { method: "POST" }),
    me: () => request("/auth/me"),
  },
  businesses: {
    list: () => request("/businesses"),
  },
  customers: {
    list: (params?: { search?: string; status?: string; businessId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.status && params.status !== "all") qs.set("status", params.status);
      if (params?.businessId && params.businessId !== "all") qs.set("businessId", params.businessId);
      return request(`/customers${qs.toString() ? `?${qs}` : ""}`);
    },
    get: (id: string) => request(`/customers/${id}`),
    dailyFocus: () => request("/customers/daily-focus"),
    revenue: () => request("/customers/revenue"),
    create: (data: {
      name: string;
      email?: string;
      phone?: string;
      status?: string;
      businessIds?: string[];
      source?: string;
      estimatedValue?: string | number;
    }) => request("/customers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: {
      status?: string;
      lostReason?: string;
      memory?: string;
      estimatedValue?: string | number | null;
      source?: string;
      name?: string;
      email?: string;
      phone?: string;
    }) => request(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request(`/customers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    delete: (id: string) => request(`/customers/${id}`, { method: "DELETE" }),
  },
  interactions: {
    list: (params?: { customerId?: string; type?: string; limit?: number; includeCustomer?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.customerId) qs.set("customerId", params.customerId);
      if (params?.type) qs.set("type", params.type);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.includeCustomer) qs.set("includeCustomer", "true");
      return request(`/interactions${qs.toString() ? `?${qs}` : ""}`);
    },
    followUps: (pending?: boolean) =>
      request(`/interactions/follow-ups${pending ? "?pending=true" : ""}`),
    stats: () => request("/interactions/stats"),
    create: (data: { customerId: string; type: string; content: string; amount?: string; followUpDate?: string }) =>
      request("/interactions", { method: "POST", body: JSON.stringify(data) }),
    complete: (id: string) =>
      request(`/interactions/${id}`, { method: "PATCH", body: JSON.stringify({ isCompleted: true }) }),
  },
  ai: {
    parseCapture: (text: string, businesses: any[]) =>
      request("/ai/parse-capture", { method: "POST", body: JSON.stringify({ text, businesses }) }),
    customerSummary: (id: string) => request(`/ai/customer-summary/${id}`),
    generateReply: (data: { customerMessage: string; tone: string; customerId?: string }) =>
      request("/ai/reply", { method: "POST", body: JSON.stringify(data) }),
    nextAction: (id: string) => request(`/ai/next-action/${id}`),
    weeklyInsight: (stats: any) =>
      request("/ai/weekly-insight", { method: "POST", body: JSON.stringify({ stats }) }),
    monthlyInsight: (data: { current: any; previous: any; byBusiness: any[] }) =>
      request("/ai/monthly-insight", { method: "POST", body: JSON.stringify(data) }),
  },
  stats: {
    weekly: () => request("/stats/weekly"),
    monthly: () => request("/stats/monthly"),
  },
};
