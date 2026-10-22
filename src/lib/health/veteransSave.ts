/** Public failure code is fixed; never expose provider/database error bodies. */
export class VeteransSaveUnconfirmed extends Error {
  constructor() {super('Veterans preparation save could not be confirmed.');}
}
export const veteransSaveFailureCode = 'veterans_save_unconfirmed' as const;
export const veteransSaveFailureMessage = 'Your answer could not be confirmed saved. Some conversation messages may have saved. Review this conversation before retrying; no claim was filed or submitted.';

export class VeteransEvidenceUnavailable extends Error {
  constructor(){super('Selected veterans evidence unavailable.');}
}
export const veteransEvidenceFailureCode = 'veterans_evidence_unavailable' as const;
export const veteransEvidenceFailureMessage = 'Selected claim or document evidence is unavailable. Check your selection and reload the original before trying again. No claim was filed or submitted.';
