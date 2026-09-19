import apiClient from "./client";

export const getDashboardStats = () =>
  apiClient.get("/dashboard/stats").then((res) => res.data.stats);
