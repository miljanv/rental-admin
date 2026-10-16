import {
  companyExpenseWriteSchema,
  inferCompanyExpenseVatRate,
  isoDateSchema,
  splitCompanyExpenseAmount,
  type CompanyExpenseScope,
  type CompanyExpenseDto,
  type CompanyExpenseVatRate,
  type CompanyExpenseWriteRequest,
  type PaymentMethod,
} from '@rental-admin/shared';
import { z } from 'zod';

export interface CompanyExpenseFormValues {
  issuedAt: string;
  supplyDate: string;
  invoiceNumber: string;
  supplier: string;
  description: string;
  amount: number | '';
  vatRate: CompanyExpenseVatRate;
  paymentMethod: PaymentMethod | '';
  scope: CompanyExpenseScope;
  vehicleId: string;
  odometerKm: number | null;
}

const toNumberOrUndefined = (value: unknown): unknown => {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined;
  }

  return value;
};

const toNullableNumber = (value: unknown): unknown => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return null;
  }

  return value;
};

export const companyExpenseFormSchema = z
  .object({
    issuedAt: isoDateSchema,
    supplyDate: isoDateSchema,
    invoiceNumber: z.string(),
    supplier: z.string().trim().min(1, 'Dobavljač je obavezan.').max(120),
    description: z.string().trim().min(1, 'Opis troška je obavezan.').max(500),
    amount: z.preprocess(
      toNumberOrUndefined,
      z.number().positive('Iznos mora biti veći od nule.').max(10_000_000, 'Iznos nije ispravan.'),
    ),
    vatRate: z.union([z.literal(0), z.literal(10), z.literal(20)]),
    paymentMethod: z.string(),
    scope: z.enum(['VEHICLE', 'COMMON', 'SUBCONTRACTOR', 'BANK']),
    vehicleId: z.string(),
    odometerKm: z.preprocess(
      toNullableNumber,
      z
        .number()
        .int('Km mora biti ceo broj.')
        .min(0, 'Km ne može biti negativno.')
        .max(10_000_000, 'Km nije ispravno.')
        .nullable(),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'VEHICLE' && !value.vehicleId) {
      ctx.addIssue({
        code: 'custom',
        path: ['vehicleId'],
        message: 'Vozilo je obavezno za trošak vozila.',
      });
    }

    if (value.scope === 'VEHICLE' && value.odometerKm === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['odometerKm'],
        message: 'Km je obavezan za trošak vezan za vozilo.',
      });
    }

    if (value.scope !== 'VEHICLE' && value.odometerKm !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['odometerKm'],
        message: 'Km se unosi samo za trošak vezan za vozilo.',
      });
    }
  });

export const toCompanyExpenseWriteRequest = (
  values: CompanyExpenseFormValues,
): CompanyExpenseWriteRequest => {
  const amount = typeof values.amount === 'number' ? values.amount : Number(values.amount);

  return companyExpenseWriteSchema.parse({
    issuedAt: values.issuedAt,
    supplyDate: values.supplyDate,
    invoiceNumber: values.invoiceNumber,
    supplier: values.supplier,
    description: values.description,
    paymentMethod: values.paymentMethod,
    scope: values.scope,
    vehicleId: values.vehicleId,
    odometerKm: values.odometerKm,
    ...splitCompanyExpenseAmount(amount, values.vatRate),
  });
};

export const EMPTY_COMPANY_EXPENSE_FORM: CompanyExpenseFormValues = {
  issuedAt: '',
  supplyDate: '',
  invoiceNumber: '',
  supplier: '',
  description: '',
  amount: '',
  vatRate: 20,
  paymentMethod: '',
  scope: 'COMMON',
  vehicleId: '',
  odometerKm: null,
};

export const toCompanyExpenseFormValues = (
  expense: CompanyExpenseDto,
): CompanyExpenseFormValues => ({
  issuedAt: expense.issuedAt,
  supplyDate: expense.supplyDate ?? expense.issuedAt,
  invoiceNumber: expense.invoiceNumber ?? '',
  supplier: expense.supplier,
  description: expense.description,
  amount: expense.amountWithVat,
  vatRate: inferCompanyExpenseVatRate(expense),
  paymentMethod: expense.paymentMethod ?? '',
  scope: expense.scope,
  vehicleId: expense.vehicleId ?? '',
  odometerKm: expense.odometerKm,
});
