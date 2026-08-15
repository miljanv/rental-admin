import type {
  AbsenceAttestationParams,
  DriverIdParams,
  GenerateAbsenceAttestationRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as absenceAttestationService from '../services/absence-attestation.service';
import { sendSuccess } from '../utils/api-response';

export const listAbsenceAttestations = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const attestations = await absenceAttestationService.listAbsenceAttestations(id);

  sendSuccess(res, attestations);
};

export const generateAbsenceAttestation = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<GenerateAbsenceAttestationRequest>(req, 'body');
  const result = await absenceAttestationService.generateAbsenceAttestation(id, body);

  sendSuccess(res, result, 201);
};

export const deleteAbsenceAttestation = async (req: Request, res: Response): Promise<void> => {
  const { id, attestationId } = validated<AbsenceAttestationParams>(req, 'params');
  const result = await absenceAttestationService.deleteAbsenceAttestation(id, attestationId);

  sendSuccess(res, result);
};
