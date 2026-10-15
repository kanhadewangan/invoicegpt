type PayPalErrorBody = {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: { issue?: string; description?: string; field?: string }[];
  // OAuth endpoint uses a different shape
  error?: string;
  error_description?: string;
};

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly debugId?: string,
    readonly details?: PayPalErrorBody["details"],
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export async function toPayPalError(res: Response): Promise<PayPalError> {
  const body = (await res.json().catch(() => ({}))) as PayPalErrorBody;
  const detail = body.details?.[0];
  const message =
    detail?.description ??
    body.message ??
    body.error_description ??
    `PayPal request failed with status ${res.status}`;
  return new PayPalError(message, res.status, body.debug_id, body.details);
}
