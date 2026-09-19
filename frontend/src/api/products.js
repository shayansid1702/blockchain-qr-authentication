import apiClient from "./client";

export const listProducts = () =>
  apiClient.get("/products").then((res) => res.data.products);

export const getProduct = (contractProductId) =>
  apiClient.get(`/products/${contractProductId}`).then((res) => res.data.product);

export const verifyProduct = (contractProductId) =>
  apiClient.post(`/products/${contractProductId}/verify`).then((res) => res.data);

export const getProductHistory = (contractProductId) =>
  apiClient.get(`/products/${contractProductId}/history`).then((res) => res.data.transactions);

export const createProduct = (payload) =>
  apiClient.post("/products", payload).then((res) => res.data);

export const revokeProductSync = (contractProductId, txHash) =>
  apiClient
    .patch(`/products/${contractProductId}/revoke`, { txHash })
    .then((res) => res.data);

export const transferProductSync = (contractProductId, txHash, toWallet) =>
  apiClient
    .patch(`/products/${contractProductId}/transfer`, { txHash, toWallet })
    .then((res) => res.data);
