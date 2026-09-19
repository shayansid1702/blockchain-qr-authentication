export const PRODUCT_STATUS = ["ACTIVE", "REVOKED", "SOLD"];

export function dateToUnixSeconds(dateString) {
  if (!dateString) return 0;
  return Math.floor(new Date(dateString).getTime() / 1000);
}

export function unixToDateLabel(unixSeconds) {
  const value = Number(unixSeconds);
  if (!value) return "—";
  return new Date(value * 1000).toLocaleDateString();
}

export function timestampToLabel(unixSeconds) {
  const value = Number(unixSeconds);
  if (!value) return "—";
  return new Date(value * 1000).toLocaleString();
}

/** Normalizes the tuple returned by the contract's getProduct() into a plain object. */
export function parseOnChainProduct(raw) {
  return {
    productId: raw.productId,
    productName: raw.productName,
    brand: raw.brand,
    batchNumber: raw.batchNumber,
    manufacturingDate: raw.manufacturingDate,
    expiryDate: raw.expiryDate,
    manufacturer: raw.manufacturer,
    currentOwner: raw.currentOwner,
    status: PRODUCT_STATUS[Number(raw.status)],
    createdAt: raw.createdAt,
    exists: raw.exists,
  };
}
