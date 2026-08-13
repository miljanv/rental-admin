import type { FileObjectDto } from './file';

export interface DashboardStats {
  totalFiles: number;
  /** Sum of the size of every uploaded file, in bytes. */
  totalSize: number;
  uploadedToday: number;
  recentFiles: FileObjectDto[];
}
