// Asigna un color de insignia a un rol de forma determinística, para que
// cualquier rol creado desde RolesPage (no solo los roles semilla) se vea
// consistente en Usuarios sin tener que mantener una lista de nombres a mano.
const PALETTE = [
  { bg: 'var(--blue-soft-bg)', color: 'var(--brand-blue)' },
  { bg: 'var(--purple-soft-bg)', color: 'var(--brand-purple)' },
  { bg: 'var(--success-soft-bg)', color: 'var(--brand-success)' },
  { bg: 'var(--amber-soft-bg)', color: 'var(--amber-action)' },
];

export const getRoleBadgeColors = (roleName = '') => {
  if (!roleName) return { bg: 'var(--neutral-soft-bg)', color: 'var(--text-muted)' };
  if (roleName === 'Administrador') return { bg: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' };

  let hash = 0;
  for (let i = 0; i < roleName.length; i += 1) {
    hash = (hash * 31 + roleName.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};
