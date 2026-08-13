import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  rows?: number;
  columns: number;
}

/** Placeholder rows that keep the table layout stable while data loads. */
export function TableSkeleton({ rows = 5, columns }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className="h-4" style={{ width: columnIndex === 0 ? '60%' : '40%' }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
