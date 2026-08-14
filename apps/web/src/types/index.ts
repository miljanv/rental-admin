/**
 * The API contract lives in the shared workspace package so the client and the
 * server can never drift apart. Re-exported here so feature code can import
 * every domain type from `@/types`.
 */
export type {
  ApiErrorBody,
  ApiErrorCode,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiResponse,
  ApiSuccessResponse,
  DashboardStats,
  DeleteDriverDocumentResult,
  DeleteDriverResult,
  DeleteFileResult,
  DriverDocumentDto,
  DriverDocumentType,
  DriverDto,
  DriverStatus,
  DownloadUrlResult,
  FileObjectDto,
  FileSortField,
  FileStatus,
  ListFilesQuery,
  PaginationMeta,
  PresignUploadRequest,
  PresignUploadResult,
  PreviewUrlResult,
  SortOrder,
} from '@rental-admin/shared';
