import { auth } from '../auth/auth.js';
import { assignUserToCompany } from '../repositories/user.repository.js';
import { generateRandomPassword } from './password.js';

export const inviteUserToCompany = async (input: {
  email: string;
  name: string;
  role: 'fleet_manager' | 'maintenance' | 'driver';
  companyId: string;
}) => {
  const tempPassword = generateRandomPassword(16);
  const result = await auth.api.createUser({
    body: { email: input.email, password: tempPassword, name: input.name, role: input.role },
  });
  await assignUserToCompany(result.user.id, input.companyId);
  return { user: result.user, tempPassword };
};
