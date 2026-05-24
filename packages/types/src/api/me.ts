export interface ApiMe {
  id: string;
  email: string;
  role: string | null;
  company: { slug: string } | null;
}
