/** A company payment card ("OMV kartica", "EW kartica") a driver can say paid an expense. */
export interface PaymentCardDto {
  id: string;
  name: string;
  isActive: boolean;
}
