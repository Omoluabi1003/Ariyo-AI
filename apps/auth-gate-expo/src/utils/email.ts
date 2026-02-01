export const isValidEmail = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length < 5) {
    return false;
  }

  const [localPart, domain] = trimmed.split('@');
  if (!localPart || !domain) {
    return false;
  }

  const hasDot = domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
  return hasDot;
};
