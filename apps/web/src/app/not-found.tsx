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
        title="Stranica nije pronađena"
        description="Stranica koju tražite ne postoji."
        action={
          <Button asChild size="sm">
            <Link href="/drivers">Nazad na zaposlene</Link>
          </Button>
        }
      />
    </Card>
  );
}
