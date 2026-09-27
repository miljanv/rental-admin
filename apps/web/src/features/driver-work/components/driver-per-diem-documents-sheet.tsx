'use client';

import {
  buildTravelHoursBreakdown,
  DOMESTIC_PER_DIEM_RATE_RSD,
  FOREIGN_PER_DIEM_RATE_EUR,
  type DriverTripPerDiemDto,
  type GenerateDriverPerDiemDocumentRequest,
} from '@rental-admin/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { useGenerateDriverPerDiemDocument } from '@/features/driver-work/hooks/use-generate-driver-per-diem-document';
import { formatMoney } from '@/lib/format';

interface DriverPerDiemDocumentsSheetProps {
  driverId: string;
  trip: DriverTripPerDiemDto | null;
  onOpenChange: (open: boolean) => void;
}

const toLocalInput = (isoDate: string, time: string): string => `${isoDate}T${time}`;

export function DriverPerDiemDocumentsSheet({
  driverId,
  trip,
  onOpenChange,
}: DriverPerDiemDocumentsSheetProps) {
  const decision = useGenerateDriverPerDiemDocument(driverId, 'decision');
  const order = useGenerateDriverPerDiemDocument(driverId, 'order');
  const settlement = useGenerateDriverPerDiemDocument(driverId, 'settlement');

  const defaults = useMemo(() => {
    if (!trip) {
      return null;
    }

    const stored = trip.travelTimeline;
    const departureDate = trip.departureDate;
    const returnDate = trip.returnDate ?? trip.departureDate;

    return {
      documentNumber: '',
      departureAt: stored?.departureAt?.slice(0, 16) ?? toLocalInput(departureDate, '08:00'),
      returnAt: stored?.returnAt?.slice(0, 16) ?? toLocalInput(returnDate, '20:00'),
      borderCrossings:
        stored?.borderCrossings.map((crossing) => ({
          at: crossing.at.slice(0, 16),
          direction: crossing.direction,
        })) ??
        (trip.isDomestic
          ? []
          : [
              {
                at: toLocalInput(departureDate, '12:00'),
                direction: 'OUT' as const,
              },
              {
                at: toLocalInput(returnDate, '12:00'),
                direction: 'IN' as const,
              },
            ]),
      advanceAmount: trip.advanceAmount ?? 0,
    };
  }, [trip]);

  const [documentNumber, setDocumentNumber] = useState('');
  const [departureAt, setDepartureAt] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [crossings, setCrossings] = useState<
    Array<{ at: string; direction: 'OUT' | 'IN' }>
  >([]);
  const [advanceAmount, setAdvanceAmount] = useState(0);

  useEffect(() => {
    if (!trip || !defaults) {
      return;
    }

    setDocumentNumber(defaults.documentNumber);
    setDepartureAt(defaults.departureAt);
    setReturnAt(defaults.returnAt);
    setCrossings(defaults.borderCrossings);
    setAdvanceAmount(defaults.advanceAmount);
  }, [defaults, trip]);

  const preview = useMemo(() => {
    if (!departureAt || !returnAt) {
      return null;
    }

    try {
      return buildTravelHoursBreakdown({
        departureAt,
        returnAt,
        borderCrossings: crossings,
      });
    } catch {
      return null;
    }
  }, [crossings, departureAt, returnAt]);

  const buildBody = (): GenerateDriverPerDiemDocumentRequest => ({
    tripId: trip!.tripId,
    documentNumber: documentNumber || null,
    advanceAmount,
    timeline: {
      departureAt,
      returnAt,
      borderCrossings: crossings,
    },
  });

  const pending = decision.isPending || order.isPending || settlement.isPending;

  return (
    <Sheet open={trip != null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Dokumenta za dnevnice</SheetTitle>
          <SheetDescription>
            {trip
              ? `${trip.origin} – ${trip.destination}. Unesite polazak, prelaze granice i povratak.`
              : 'Vožnja'}
          </SheetDescription>
        </SheetHeader>

        {trip ? (
          <div className="flex flex-col gap-4 px-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-number">Broj dokumenta</Label>
              <Input
                id="doc-number"
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                placeholder="npr. 1"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="departure-at">Polazak</Label>
                <Input
                  id="departure-at"
                  type="datetime-local"
                  value={departureAt}
                  onChange={(event) => setDepartureAt(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="return-at">Povratak</Label>
                <Input
                  id="return-at"
                  type="datetime-local"
                  value={returnAt}
                  onChange={(event) => setReturnAt(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Prelazi granice</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCrossings((current) => [
                      ...current,
                      { at: departureAt || toLocalInput(trip.departureDate, '12:00'), direction: 'OUT' },
                    ])
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  Dodaj
                </Button>
              </div>
              {crossings.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Za put u zemlji nije potreban prelaz. Za inostranstvo dodajte OUT pa IN.
                </p>
              ) : (
                crossings.map((crossing, index) => (
                  <div key={`${crossing.at}-${index}`} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label>Vreme</Label>
                      <Input
                        type="datetime-local"
                        value={crossing.at}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCrossings((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, at: value } : item,
                            ),
                          );
                        }}
                      />
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Label>Smer</Label>
                      <Select
                        value={crossing.direction}
                        onValueChange={(value) => {
                          setCrossings((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, direction: value as 'OUT' | 'IN' }
                                : item,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OUT">OUT (izlaz)</SelectItem>
                          <SelectItem value="IN">IN (ulaz)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Ukloni prelaz"
                      onClick={() =>
                        setCrossings((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advance">Akontacija na dokumentu</Label>
              <Input
                id="advance"
                type="number"
                step="0.01"
                value={advanceAmount}
                onChange={(event) => setAdvanceAmount(Number(event.target.value) || 0)}
              />
              <p className="text-muted-foreground text-xs">
                Za inostranstvo u EUR, za zemlju u RSD — bez konverzije.
              </p>
            </div>

            <div className="bg-muted/40 rounded-lg border p-3 text-sm">
              <p className="font-medium">Pravilo sati</p>
              <p className="text-muted-foreground mt-1">
                0–6h = 0 · 6–12h = 0,5 · 12–24h = 1 dnevnica (posebno za zemlju i inostranstvo).
              </p>
              <p className="text-muted-foreground mt-1">
                Plafon: {formatMoney(DOMESTIC_PER_DIEM_RATE_RSD)} / {FOREIGN_PER_DIEM_RATE_EUR} EUR.
              </p>
              {preview ? (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Sati u zemlji</dt>
                    <dd className="font-medium">
                      {preview.domesticHours}h → {preview.domesticUnits} ×{' '}
                      {formatMoney(preview.domesticAmountRsd)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Sati u inostranstvu</dt>
                    <dd className="font-medium">
                      {preview.foreignHours}h → {preview.foreignUnits} × {preview.foreignAmountEur}{' '}
                      EUR
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-destructive mt-2 text-xs">Proverite redosled vremena.</p>
              )}
            </div>

            <SheetFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                disabled={pending || !preview}
                onClick={() => void decision.mutateAsync(buildBody())}
              >
                {decision.isPending ? 'Generisanje…' : 'Odluka o upućivanju (PDF)'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending || !preview}
                onClick={() => void order.mutateAsync(buildBody())}
              >
                {order.isPending ? 'Generisanje…' : 'Nalog za službeni put (Excel)'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending || !preview}
                onClick={() => void settlement.mutateAsync(buildBody())}
              >
                {settlement.isPending ? 'Generisanje…' : 'Obračun dnevnice (Excel)'}
              </Button>
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
