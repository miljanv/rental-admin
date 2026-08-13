import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <Card className="shadow-none">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for does not exist."
        action={
          <Button asChild size="sm">
            <Link href="/">Back to dashboard</Link>
          </Button>
        }
      />
    </Card>
  );
}
