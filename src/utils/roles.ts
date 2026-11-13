const roleName = (role: any) => String(
  typeof role === 'object' ? role?.name || role?.role_name || '' : role || '',
).trim().toLowerCase();

export const isSuperadminUser = (user: any): boolean => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return [user?.role, user?.role_name, ...roles].some(role => roleName(role) === 'superadmin');
};
