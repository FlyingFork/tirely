export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  firstLogin: boolean;
  companyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
