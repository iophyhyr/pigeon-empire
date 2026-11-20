/** Единое отображение чисел в HUD и магазине (дроби дохода не теряются). */
export function formatAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}
