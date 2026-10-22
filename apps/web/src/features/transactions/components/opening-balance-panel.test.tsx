import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpeningBalanceDto } from '@rental-admin/shared';
import { OpeningBalancePanel } from './opening-balance-panel';
const mocks = vi.hoisted(() => ({
  records: [] as OpeningBalanceDto[],
  confirm: vi.fn(),
  reverse: vi.fn(),
}));
vi.mock('../hooks/use-payment-settlement', () => ({
  useOpeningBalances: () => ({ data: mocks.records, isPending: false, isError: false }),
  useConfirmOpeningBalance: () => ({ mutate: mocks.confirm, isPending: false }),
  useReverseOpeningBalance: () => ({ mutate: mocks.reverse, isPending: false }),
  useSaveOpeningBalance: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('./payment-allocation-panel', () => ({ PaymentAllocationPanel: () => null }));
const record: OpeningBalanceDto = {
  id: 'opening-1',
  partyType: 'SUPPLIER',
  partyId: 'supplier-1',
  kind: 'DEBT',
  amount: 2300,
  asOfDate: '2026-01-01',
  note: null,
  status: 'DRAFT',
  confirmedAt: null,
  confirmedById: null,
  reversedAt: null,
  reversedById: null,
  reversalReason: null,
  allocatedAmount: 0,
  remainingAmount: 2300,
  creditTransaction: null,
  payments: [],
  history: [],
};
beforeEach(() => {
  mocks.records = [record];
  vi.clearAllMocks();
});
describe('opening balance confirmation', () => {
  it('requires an explicit acknowledgment before confirming the saved draft', () => {
    render(<OpeningBalancePanel party={{ partyType: 'SUPPLIER', partyId: 'supplier-1' }} />);
    const confirm = screen.getByRole('button', { name: 'Potvrdi početno stanje' });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(mocks.confirm).toHaveBeenCalledWith('opening-1', expect.any(Object));
  });
  it('locks a confirmed balance and requires a reason before reversing it', () => {
    mocks.records = [{ ...record, status: 'CONFIRMED' }];
    render(<OpeningBalancePanel party={{ partyType: 'SUPPLIER', partyId: 'supplier-1' }} />);
    expect(screen.queryByRole('button', { name: 'Izmeni nacrt' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ispravka početnog stanja'));
    const reverse = screen.getByRole('button', { name: 'Storniraj početno stanje' });
    expect(reverse).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Razlog storniranja'), {
      target: { value: 'Pogrešan iznos' },
    });
    expect(reverse).toBeEnabled();
    fireEvent.click(reverse);
    expect(mocks.reverse).toHaveBeenCalledWith(
      { id: 'opening-1', reason: 'Pogrešan iznos' },
      expect.any(Object),
    );
  });
  it('does not let a user reverse a balance until its payments are unlinked', () => {
    mocks.records = [{ ...record, status: 'CONFIRMED', allocatedAmount: 1000 }];
    render(<OpeningBalancePanel party={{ partyType: 'SUPPLIER', partyId: 'supplier-1' }} />);
    fireEvent.click(screen.getByText('Ispravka početnog stanja'));
    fireEvent.change(screen.getByLabelText('Razlog storniranja'), {
      target: { value: 'Pogrešan iznos' },
    });
    expect(screen.getByRole('button', { name: 'Storniraj početno stanje' })).toBeDisabled();
  });
});
