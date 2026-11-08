import type { FieldErrors, FieldValues } from 'react-hook-form';
import { toast } from 'sonner';

/** Customer fields first: a missing customer is the most common reason a trip is not saved. */
const CLIENT_FIELDS = ['partnerId', 'clientName'];

const errorMessage = (error: unknown): string | undefined =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : undefined;

/**
 * Called when a trip form fails validation: says what is wrong in a toast and brings the first
 * invalid field into view. The customer picker is a Radix Select, which the form library cannot
 * focus by itself, so without this the error can sit off-screen at the top of a long form.
 *
 * `fieldIds` maps a form field to its element id when the two differ.
 */
export const revealTripFormErrors = <T extends FieldValues>(
  errors: FieldErrors<T>,
  fieldIds: Partial<Record<string, string>> = {},
): void => {
  const idFor = (field: string): string => fieldIds[field] ?? field;
  const fields = Object.keys(errors);
  const clientField = CLIENT_FIELDS.find(
    (field) => fields.includes(field) && document.getElementById(idFor(field)),
  );
  const firstField =
    clientField ?? fields.find((field) => document.getElementById(idFor(field))) ?? fields[0];

  if (!firstField) {
    return;
  }

  toast.error(clientField ? 'Kupac je obavezan.' : 'Vožnja nije sačuvana.', {
    description: errorMessage(errors[firstField]) ?? 'Proverite označena polja.',
  });

  const element = document.getElementById(idFor(firstField));
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element?.focus({ preventScroll: true });
};
