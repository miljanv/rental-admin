'use client';

import {
  canRecordFuelLog,
  DRIVER_REPORT_EXPENSE_STATUS_LABELS,
  FUEL_LOG_FUEL_TYPE_LABELS,
  DRIVER_REPORT_STATUS_LABELS,
  TRIP_EXPENSE_CATEGORIES,
  TRIP_EXPENSE_CATEGORY_LABELS,
  TRIP_EXPENSE_PAYMENT_METHODS,
  TRIP_EXPENSE_PAYMENT_METHOD_LABELS,
  TRIP_KM_SOURCE_LABELS,
  type DriverReportAdminDto,
  type DriverReportAdminExpenseDto,
  type TripExpenseCategory,
  type TripExpensePaymentMethod,
} from '@rental-admin/shared';
import { Check, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { usePreviewDocumentScan } from '@/features/driver-documents/hooks/use-preview-document-scan';
import { useAcceptDriverReport } from '@/features/driver-reports/hooks/use-accept-driver-report';
import { useReturnDriverReport } from '@/features/driver-reports/hooks/use-return-driver-report';
import {
  driverReportKm,
  formatReportKm,
  reviewedLabel,
} from '@/features/driver-reports/lib/driver-report';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

type Decision = 'accept' | 'reject';

interface ExpenseDraft {
  /** Null until the office picks one; an undecided expense stays pending. */
  decision: Decision | null;
  category: TripExpenseCategory;
  amount: string;
  paymentMethod: TripExpensePaymentMethod;
  addFuelLog: boolean;
  rejectionReason: string;
}

const DECISION_LABELS: Record<Decision, string> = {
  accept: 'Prihvati',
  reject: 'Odbij',
};

const DECISION_ICONS: Record<Decision, typeof Check> = {
  accept: Check,
  reject: X,
};

/** Tinted while undecided so the choice stands out; solid once picked. */
const DECISION_CLASSES: Record<Decision, { idle: string; active: string }> = {
  accept: {
    idle: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300',
    active: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600/90',
  },
  reject: {
    idle: 'border-rose-500/50 bg-rose-500/10 text-rose-800 hover:bg-rose-500/20 dark:text-rose-300',
    active: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-600/90',
  },
};

const draftFor = (expense: DriverReportAdminExpenseDto): ExpenseDraft => ({
  decision: null,
  category: expense.category,
  amount: String(expense.amount),
  paymentMethod: expense.paymentMethod,
  addFuelLog: canRecordFuelLog(expense),
  rejectionReason: '',
});

const litersFormatter = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 2 });

/** "210,5 l Dizel · 184.500 km · NIS Čoka", empty parts left out. */
const fuelSummary = (expense: DriverReportAdminExpenseDto): string | null => {
  if (expense.category !== 'FUEL' || expense.fuelLiters === null) {
    return null;
  }

  return [
    `${litersFormatter.format(expense.fuelLiters)} l${
      expense.fuelType ? ` ${FUEL_LOG_FUEL_TYPE_LABELS[expense.fuelType]}` : ''
    }`,
    expense.fuelOdometerKm !== null ? formatReportKm(expense.fuelOdometerKm) : null,
    expense.fuelStation,
  ]
    .filter(Boolean)
    .join(' · ');
};

interface DriverReportReviewSheetProps {
  report: DriverReportAdminDto | null;
  onOpenChange: (open: boolean) => void;
}

export function DriverReportReviewSheet({ report, onOpenChange }: DriverReportReviewSheetProps) {
  return (
    <Sheet open={report !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {report ? (
          <ReviewBody
            key={`${report.id}-${report.updatedAt}`}
            report={report}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ReviewBody({ report, onDone }: { report: DriverReportAdminDto; onDone: () => void }) {
  const acceptMutation = useAcceptDriverReport();
  const returnMutation = useReturnDriverReport();
  const previewMutation = usePreviewDocumentScan();
  const pending = report.expenses.filter((expense) => expense.status === 'PENDING');
  const handled = report.expenses.filter((expense) => expense.status !== 'PENDING');
  const [drafts, setDrafts] = useState<Record<string, ExpenseDraft>>(() =>
    Object.fromEntries(pending.map((expense) => [expense.id, draftFor(expense)])),
  );
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isPending = acceptMutation.isPending || returnMutation.isPending;
  const totalKm = driverReportKm(report);
  const canReview = report.status === 'SUBMITTED' || pending.length > 0;
  const decided = pending.map((expense) => drafts[expense.id]?.decision);
  const acceptCount = decided.filter((decision) => decision === 'accept').length;
  const rejectCount = decided.filter((decision) => decision === 'reject').length;
  const saveLabel =
    pending.length === 0
      ? 'Potvrdi unos'
      : [
          acceptCount > 0 ? `prihvati ${acceptCount}` : null,
          rejectCount > 0 ? `odbij ${rejectCount}` : null,
        ]
          .filter(Boolean)
          .join(', ');

  const updateDraft = (id: string, patch: Partial<ExpenseDraft>) =>
    setDrafts((current) => {
      const draft = current[id];
      return draft ? { ...current, [id]: { ...draft, ...patch } } : current;
    });

  const saveDecisions = async () => {
    const decisions = [];

    for (const expense of pending) {
      const draft = drafts[expense.id];

      if (!draft || draft.decision === null) {
        continue;
      }

      const amount = Number(draft.amount.replace(',', '.'));

      if (draft.decision === 'accept' && (!Number.isFinite(amount) || amount <= 0)) {
        setError('Iznos prihvaćenog troška mora biti veći od nule.');
        return;
      }

      decisions.push(
        draft.decision === 'accept'
          ? {
              id: expense.id,
              accept: true,
              category: draft.category,
              amount,
              paymentMethod: draft.paymentMethod,
              addFuelLog:
                draft.addFuelLog && canRecordFuelLog({ ...expense, category: draft.category }),
            }
          : {
              id: expense.id,
              accept: false,
              rejectionReason: draft.rejectionReason.trim() || null,
            },
      );
    }

    setError(null);

    try {
      await acceptMutation.mutateAsync({
        id: report.id,
        body: { expenses: decisions, comment: comment.trim() || null },
      });
      onDone();
    } catch {
      // The mutation reports the failure as a toast.
    }
  };

  const sendBack = async () => {
    if (comment.trim().length < 3) {
      setError('Napišite vozaču šta treba da ispravi.');
      return;
    }

    setError(null);

    try {
      await returnMutation.mutateAsync({ id: report.id, body: { comment: comment.trim() } });
      onDone();
    } catch {
      // The mutation reports the failure as a toast.
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {report.driver.firstName} {report.driver.lastName}
        </SheetTitle>
        <SheetDescription>
          {formatDate(report.trip.departureDate)} · {report.trip.origin} → {report.trip.destination}
          {report.trip.clientName ? ` · ${report.trip.clientName}` : ''}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{DRIVER_REPORT_STATUS_LABELS[report.status]}</Badge>
          <span className="text-muted-foreground">
            Poslato {formatDateTime(report.submittedAt)}
          </span>
          <Link href={`/trips/${report.trip.id}`} className="text-primary ml-auto hover:underline">
            Otvori vožnju
          </Link>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Kilometraža</h3>
          {report.vehicles.length === 0 ? (
            <p className="text-muted-foreground text-sm">Vozač nije uneo kilometražu.</p>
          ) : (
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              {report.vehicles.map((vehicle) => (
                <div key={vehicle.vehicleId} className="space-y-0.5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{vehicle.licensePlate}</span>
                    <span>
                      {formatReportKm(vehicle.startKm)} → {formatReportKm(vehicle.endKm)}
                      {vehicle.distanceKm !== null
                        ? ` = ${formatReportKm(vehicle.distanceKm)}`
                        : ''}
                    </span>
                  </div>
                  {vehicle.garageStartKm !== null || vehicle.garageEndKm !== null ? (
                    <p className="text-muted-foreground text-xs">
                      Garaža {formatReportKm(vehicle.garageStartKm)} →{' '}
                      {formatReportKm(vehicle.garageEndKm)}
                      {vehicle.garageDistanceKm !== null
                        ? ` = ${formatReportKm(vehicle.garageDistanceKm)} ukupno`
                        : ''}
                    </p>
                  ) : null}
                </div>
              ))}
              {report.vehicles.length > 1 && totalKm !== null ? (
                <p className="border-t pt-1 font-medium">Ukupno: {formatReportKm(totalKm)}</p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                Kilometraža je već upisana na vožnju (
                {report.vehicles
                  .map((vehicle) =>
                    vehicle.currentKmSource
                      ? `${vehicle.licensePlate}: ${TRIP_KM_SOURCE_LABELS[vehicle.currentKmSource]}`
                      : vehicle.licensePlate,
                  )
                  .join(', ')}
                ). Ispravlja se u obračunu vožnje.
              </p>
            </div>
          )}
        </section>

        {report.startedAt || report.finishedAt || report.borderCrossings.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Vreme vožnje</h3>
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <p>
                Početak: {formatDateTime(report.startedAt)} · Završetak:{' '}
                {formatDateTime(report.finishedAt)}
              </p>
              {report.borderCrossings.map((crossing, index) => (
                <p key={`${crossing.at}-${index}`}>
                  {crossing.direction === 'OUT' ? 'Izlazak iz Srbije' : 'Ulazak u Srbiju'}:{' '}
                  {formatDateTime(crossing.at)}
                </p>
              ))}
              <p className="text-muted-foreground text-xs">
                Upisuje se u obračun dnevnica, osim ako ga je kancelarija već sama unela.
              </p>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Troškovi</h3>
          {pending.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Kod troška kliknite Prihvati ili Odbij, pa „Sačuvaj“ na dnu. Trošak bez odluke ostaje
              na čekanju, a ništa se ne upisuje dok ne sačuvate.
            </p>
          ) : null}
          {report.expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm">Vozač nije prijavio troškove.</p>
          ) : null}

          {pending.map((expense) => {
            const draft = drafts[expense.id];

            if (!draft) {
              return null;
            }

            const isRejecting = draft.decision === 'reject';

            return (
              <div
                key={expense.id}
                className={cn(
                  'space-y-3 rounded-lg border p-3',
                  draft.decision === 'reject' && 'opacity-60',
                )}
              >
                <div className="grid grid-cols-2 gap-1">
                  {(Object.keys(DECISION_LABELS) as Decision[]).map((decision) => {
                    const Icon = DECISION_ICONS[decision];
                    const isActive = draft.decision === decision;

                    return (
                      <Button
                        key={decision}
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-pressed={isActive}
                        className={cn(
                          'font-semibold',
                          isActive
                            ? DECISION_CLASSES[decision].active
                            : DECISION_CLASSES[decision].idle,
                        )}
                        disabled={isPending}
                        onClick={() =>
                          updateDraft(expense.id, { decision: isActive ? null : decision })
                        }
                      >
                        <Icon />
                        {DECISION_LABELS[decision]}
                      </Button>
                    );
                  })}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Vrsta</Label>
                    <Select
                      value={draft.category}
                      onValueChange={(value) =>
                        updateDraft(expense.id, { category: value as TripExpenseCategory })
                      }
                      disabled={isPending || isRejecting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIP_EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {TRIP_EXPENSE_CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`amount-${expense.id}`}>
                      Iznos (RSD)
                    </Label>
                    <Input
                      id={`amount-${expense.id}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) => updateDraft(expense.id, { amount: event.target.value })}
                      disabled={isPending || isRejecting}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Plaćanje</Label>
                    <Select
                      value={draft.paymentMethod}
                      onValueChange={(value) =>
                        updateDraft(expense.id, {
                          paymentMethod: value as TripExpensePaymentMethod,
                        })
                      }
                      disabled={isPending || isRejecting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIP_EXPENSE_PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {TRIP_EXPENSE_PAYMENT_METHOD_LABELS[method]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {draft.paymentMethod === 'COMPANY_CARD' && expense.paymentCard ? (
                      <p className="text-muted-foreground text-xs">{expense.paymentCard.name}</p>
                    ) : null}
                  </div>
                </div>
                {fuelSummary(expense) ? (
                  <div className="space-y-2 text-sm">
                    <p>Točenje: {fuelSummary(expense)}</p>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          draft.addFuelLog &&
                          canRecordFuelLog({ ...expense, category: draft.category })
                        }
                        onCheckedChange={(checked) =>
                          updateDraft(expense.id, { addFuelLog: checked === true })
                        }
                        disabled={
                          isPending ||
                          isRejecting ||
                          !canRecordFuelLog({ ...expense, category: draft.category })
                        }
                      />
                      <span>
                        Upiši i u evidenciju goriva
                        {canRecordFuelLog(expense) ? '' : ' (nedostaje vozilo ili km na pumpi)'}
                      </span>
                    </label>
                  </div>
                ) : null}
                {isRejecting ? (
                  <div className="space-y-1">
                    <Label htmlFor={`reject-reason-${expense.id}`} className="text-xs">
                      Razlog odbijanja (vozač ga vidi, opciono)
                    </Label>
                    <Input
                      id={`reject-reason-${expense.id}`}
                      placeholder="npr. nema računa, privatni trošak"
                      maxLength={300}
                      value={draft.rejectionReason}
                      disabled={isPending}
                      onChange={(event) =>
                        updateDraft(expense.id, { rejectionReason: event.target.value })
                      }
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {expense.note ? (
                    <span className="text-muted-foreground min-w-0 flex-1">{expense.note}</span>
                  ) : (
                    <span className="flex-1" />
                  )}
                  {expense.file ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={previewMutation.isPending}
                      onClick={() => {
                        if (expense.file) {
                          previewMutation.mutate({
                            fileId: expense.file.id,
                            tab: window.open('about:blank', '_blank'),
                          });
                        }
                      }}
                    >
                      <Eye className="size-4" aria-hidden />
                      Račun
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">Bez računa</span>
                  )}
                </div>
              </div>
            );
          })}

          {handled.map((expense) => (
            <div
              key={expense.id}
              className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <span>
                {TRIP_EXPENSE_CATEGORY_LABELS[expense.category]} ·{' '}
                {expense.paymentCard?.name ??
                  TRIP_EXPENSE_PAYMENT_METHOD_LABELS[expense.paymentMethod]}
              </span>
              <span className="font-medium">{formatMoney(expense.amount)}</span>
              <Badge variant={expense.status === 'ACCEPTED' ? 'secondary' : 'destructive'}>
                {DRIVER_REPORT_EXPENSE_STATUS_LABELS[expense.status]}
              </Badge>
              {expense.fuelLogId ? (
                <span className="text-muted-foreground w-full text-xs">
                  Upisano i u evidenciju goriva.
                </span>
              ) : null}
              {expense.status === 'REJECTED' && expense.rejectionReason ? (
                <span className="text-muted-foreground w-full text-xs">
                  Razlog: {expense.rejectionReason}
                </span>
              ) : null}
            </div>
          ))}
        </section>

        {report.note ? (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Napomena vozača</h3>
            <p className="text-sm">{report.note}</p>
          </section>
        ) : null}

        {report.adminComment ? (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Poslednji komentar kancelarije</h3>
            <p className="text-sm">{report.adminComment}</p>
          </section>
        ) : null}

        {canReview ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="review-comment">Komentar za vozača</Label>
              <Textarea
                id="review-comment"
                rows={2}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={isPending}
                placeholder="Obavezan kada vraćate unos na doradu"
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <SheetFooter className="px-0 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => void sendBack()}
                disabled={isPending}
              >
                {returnMutation.isPending ? 'Vraćanje…' : 'Vrati vozaču'}
              </Button>
              <Button
                type="button"
                onClick={() => void saveDecisions()}
                disabled={isPending || (pending.length > 0 && acceptCount + rejectCount === 0)}
              >
                {acceptMutation.isPending
                  ? 'Čuvanje…'
                  : pending.length === 0
                    ? saveLabel
                    : saveLabel
                      ? `Sačuvaj (${saveLabel})`
                      : 'Sačuvaj'}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{reviewedLabel(report)}</p>
        )}
      </div>
    </>
  );
}
