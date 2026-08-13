'use client';

import type { FileObjectDto, FileSortField, SortOrder } from '@rental-admin/shared';
import { RefreshCw, Search, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteFileDialog } from '@/features/files/components/delete-file-dialog';
import {
  FileUploadCard,
  type FileUploadCardHandle,
} from '@/features/files/components/file-upload-card';
import { FilesTable } from '@/features/files/components/files-table';
import { useDownloadFile } from '@/features/files/hooks/use-download-file';
import { useFiles } from '@/features/files/hooks/use-files';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

const SORT_OPTIONS: { value: `${FileSortField}:${SortOrder}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'originalName:asc', label: 'Name A–Z' },
  { value: 'originalName:desc', label: 'Name Z–A' },
  { value: 'size:desc', label: 'Largest first' },
  { value: 'size:asc', label: 'Smallest first' },
];

export function FilesManager() {
  const uploadCardRef = useRef<FileUploadCardHandle>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<`${FileSortField}:${SortOrder}`>('createdAt:desc');
  const [fileToDelete, setFileToDelete] = useState<FileObjectDto | null>(null);

  const [sortBy, sortOrder] = sort.split(':') as [FileSortField, SortOrder];

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = useFiles({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
    ...(search ? { search } : {}),
  });

  const downloadMutation = useDownloadFile();

  const files = query.data?.files ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Files"
        description="Upload files to private S3 storage, then download or delete them."
        actions={
          <Button onClick={() => uploadCardRef.current?.openFilePicker()}>
            <Upload className="size-4" aria-hidden />
            Upload file
          </Button>
        }
      />

      <div className="space-y-6">
        <FileUploadCard ref={uploadCardRef} />

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>All files</CardTitle>
            <CardDescription>
              {total === 0
                ? 'No files stored yet.'
                : `${total} file${total === 1 ? '' : 's'} stored.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-0">
            <div className="flex flex-col gap-3 px-6 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="file-search" className="text-xs">
                  Search
                </Label>
                <div className="relative">
                  <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    id="file-search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by file name"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="file-sort" className="text-xs">
                  Sort
                </Label>
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    setSort(value as `${FileSortField}:${SortOrder}`);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="file-sort" className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
                aria-label="Reload files"
              >
                <RefreshCw
                  className={cn('size-4', query.isFetching && 'animate-spin')}
                  aria-hidden
                />
                Reload
              </Button>
            </div>

            {query.isError ? (
              <ErrorState
                error={query.error}
                title="Could not load files"
                onRetry={() => void query.refetch()}
                isRetrying={query.isFetching}
              />
            ) : (
              <FilesTable
                files={files}
                isLoading={query.isPending}
                hasSearch={search.length > 0}
                downloadingId={
                  downloadMutation.isPending ? (downloadMutation.variables?.id ?? null) : null
                }
                onDownload={(file) =>
                  downloadMutation.mutate({ id: file.id, originalName: file.originalName })
                }
                onRequestDelete={setFileToDelete}
                emptyAction={
                  <Button size="sm" onClick={() => uploadCardRef.current?.openFilePicker()}>
                    Choose a file
                  </Button>
                }
              />
            )}

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-4 px-6 pt-2">
                <p className="text-muted-foreground text-sm">
                  Page {pagination?.page ?? page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || query.isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages || query.isFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <DeleteFileDialog
        file={fileToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setFileToDelete(null);
          }
        }}
      />
    </>
  );
}
