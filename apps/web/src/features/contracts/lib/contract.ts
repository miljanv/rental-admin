import {
  contractClientDisplayName,
  type ContractDto,
  type ContractWriteRequest,
} from '@rental-admin/shared';

export const contractLabel = (contract: ContractDto): string =>
  `${contractClientDisplayName(contract)} — ${contract.route}`;

export const toContractFormValues = (contract: ContractDto): ContractWriteRequest => ({
  partnerId: contract.partnerId,
  vehicleId: contract.vehicleId,
  driverId: contract.driverId,
  conclusionDate: contract.conclusionDate,
  route: contract.route,
  serviceStartDate: contract.serviceStartDate,
  serviceEndDate: contract.serviceEndDate,
  passengerCount: contract.passengerCount,
  price: contract.price,
  advancePercentage: contract.advancePercentage,
  status: contract.status,
  notes: contract.notes,
  isInternational: contract.isInternational,
  clientType: contract.clientType,
  clientCompanyName: contract.clientCompanyName,
  clientFirstName: contract.clientFirstName,
  clientLastName: contract.clientLastName,
  clientAddress: contract.clientAddress,
  clientPib: contract.clientPib,
  clientRegistrationNumber: contract.clientRegistrationNumber,
  clientPersonalId: contract.clientPersonalId,
});
