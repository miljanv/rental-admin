'use client';

import type { FileObjectDto } from '@rental-admin/shared';
import { Download, FileIcon, MoreHorizontal, Trash2 } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatFileSize, formatMimeType, getFileExtension } from '@/lib/format';

const COLUMN_COUNT = 5;

interface FilesTableProps {
  files: FileObjectDto[];
  isLoading: boolean;
  hasSearch: boolean;
  downloadingId: string | null;
  onDownload: (file: FileObjectDto) => void;
  onRequestDelete: (file: FileObjectDto) => void;
  emptyAction?: React.ReactNode;
}

export function FilesTable({
  files,
  isLoading,
  hasSearch,
  downloadingId,
  onDownload,
  onRequestDelete,
  emptyAction,
}: FilesTableProps) {
  if (!isLoading && files.length === 0) {
    return hasSearch ? (
      <EmptyState
        icon={FileIcon}
        title="No matching files"
        description="No file name matches your search. Try a different term."
      />
    ) : (
      <EmptyState
        icon={FileIcon}
        title="No files yet"
        description="Drag a file into the upload area above to get started."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Size</TableHead>
          <TableHead className="text-right">Uploaded</TableHead>
          <TableHead className="w-[60px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          files.map((file) => {
            const extension = getFileExtension(file.originalName);

            return (
              <TableRow key={file.id}>
                <TableCell className="max-w-[320px]">
                  <div className="flex items-center gap-3">
                    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold">
                      {extension || <FileIcon className="size-4" aria-hidden />}
                    </span>
                    <span className="truncate font-medium">{file.originalName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {formatMimeType(file.mimeType)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {formatDateTime(file.uploadedAt ?? file.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${file.originalName}`}
                        disabled={downloadingId === file.id}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onDownload(file)} className="gap-2">
                        <Download className="size-4" aria-hidden />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onRequestDelete(file)}
                        className="gap-2"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
