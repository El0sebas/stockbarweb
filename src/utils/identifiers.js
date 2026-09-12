export const generateNextIdentifier = ({ items = [], key, prefix = '', pad = 3, separator = '-' }) => {
  if (!key) {
    const fallbackNumber = 1;
    return `${prefix}${separator}${String(fallbackNumber).padStart(pad, '0')}`;
  }

  const currentMax = items.reduce((max, item) => {
    const rawValue = item?.[key];

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return Math.max(max, rawValue);
    }

    if (typeof rawValue === 'string') {
      const match = rawValue.match(/(\d+)(?!.*\d)/);
      if (match) {
        return Math.max(max, Number(match[1]));
      }
    }

    return max;
  }, 0);

  const nextValue = currentMax + 1;
  return `${prefix}${separator}${String(nextValue).padStart(pad, '0')}`;
};
