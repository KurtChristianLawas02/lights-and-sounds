export const SETUP_FEE = 1500;
export const TECHNICIAN_FEE = 2500;

export function rentalHours(startDatetime, endDatetime) {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const ms = end.getTime() - start.getTime();

  if (!Number.isFinite(ms) || ms <= 0) {
    throw new Error('End date/time must be after start date/time.');
  }

  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
}

export function priceForDuration(product, hours) {
  if (hours >= 24 && Number(product.price_per_day) > 0) {
    return Math.ceil(hours / 24) * Number(product.price_per_day);
  }

  return hours * Number(product.price_per_hour);
}

export function serviceFee({ setupNeeded, technicianNeeded }) {
  return (setupNeeded ? SETUP_FEE : 0) + (technicianNeeded ? TECHNICIAN_FEE : 0);
}

