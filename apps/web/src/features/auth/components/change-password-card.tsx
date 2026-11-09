'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';

export function ChangePasswordCard() {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Promena lozinke</CardTitle>
        <CardDescription>
          Posle promene ostajete prijavljeni ovde, a ostali uređaji se odjavljuju.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-w-md">
        <ChangePasswordForm submitLabel="Promeni lozinku" />
      </CardContent>
    </Card>
  );
}
