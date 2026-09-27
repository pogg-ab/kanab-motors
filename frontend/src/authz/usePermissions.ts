import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { hasPermission } = useAuth();

  return {
    hasPermission,
    can: hasPermission,
    any: (permissions: string[]) => permissions.some((permission) => hasPermission(permission)),
  };
};
