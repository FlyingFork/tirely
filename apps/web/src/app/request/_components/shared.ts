import { formatDate } from '@/lib/format';

export const FLEET_SIZE_OPTIONS = [
  { value: '1-10', label: '1–10 vehicles' },
  { value: '11-50', label: '11–50 vehicles' },
  { value: '51-200', label: '51–200 vehicles' },
  { value: '201-500', label: '201–500 vehicles' },
  { value: '500+', label: '500+ vehicles' },
];

export type StatusKey = 'PENDING' | 'APPROVED' | 'REJECTED';

export type SubmissionResult = {
  id: string;
  companyName: string;
  companyEmail: string;
};

export const formatRequestDate = (iso: string) => formatDate(iso);

export const formatRequestTime = (date: Date) =>
  date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
