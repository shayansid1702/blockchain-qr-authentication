import apiClient from "./client";

export const registerManufacturer = (payload) =>
  apiClient.post("/manufacturers", payload).then((res) => res.data);

export const listManufacturers = () =>
  apiClient.get("/manufacturers").then((res) => res.data.manufacturers);

export const approveManufacturer = (manufacturerId) =>
  apiClient.patch(`/manufacturers/${manufacturerId}/approve`).then((res) => res.data);
