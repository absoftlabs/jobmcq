export const getEffectivePriceForPackage = (pkg: { sale_price?: number | null; regular_price?: number | null }) =>
  Number(pkg.sale_price ?? pkg.regular_price ?? 0);
