'use client';

import { CalendarClock, Database, Files, Upload } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats';
import { formatDateTime, formatFileSize, formatMimeType } from '@/lib/format';

const RECENT_COLUMNS = 4;

export function DashboardOverview() {
  const { data, isPending, isError, error, refetch, isRefetching } = useDashboardStats();

  const recentFiles = data?.recentFiles ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total files"
          value={String(data?.totalFiles ?? 0)}
          hint="Confirmed uploads in storage"
          icon={Files}
          isLoading={isPending}
        />
        <StatCard
          label="Total size"
          value={formatFileSize(data?.totalSize ?? 0)}
          hint="Combined size of all files"
          icon={Database}
          isLoading={isPending}
        />
        <StatCard
          label="Uploaded today"
          value={String(data?.uploadedToday ?? 0)}
          hint="Since midnight UTC"
          icon={CalendarClock}
          isLoading={isPending}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Recent uploads</CardTitle>
          <CardDescription>The five most recently uploaded files.</CardDescription>
          <CardAction>
            <Button asChild variant="outline" size="sm">
              <Link href="/files">View all</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {isError ? (
            <ErrorState
              error={error}
              title="Could not load the dashboard"
              onRetry={() => void refetch()}
              isRetrying={isRefetching}
            />
          ) : !isPending && recentFiles.length === 0 ? (
            <EmptyState
              icon={Upload}
              title="No files yet"
              description="Upload your first file to see storage activity here."
              action={
                <Button asChild size="sm">
                  <Link href="/files">Upload a file</Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableSkeleton rows={5} columns={RECENT_COLUMNS} />
                ) : (
                  recentFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="max-w-[240px] truncate font-medium">
                        {file.originalName}
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
                        {formatDateTime(file.uploadedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
