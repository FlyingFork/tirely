import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc, userAc } from 'better-auth/plugins/admin/access';

const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const user = ac.newRole({
  ...userAc.statements,
});

export const admin = ac.newRole({
  ...adminAc.statements,
});

export const fleet_manager = ac.newRole({
  ...userAc.statements,
});

export const maintenance = ac.newRole({
  ...userAc.statements,
});

export const driver = ac.newRole({
  ...userAc.statements,
});
