export class ServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = 'service_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message, 400, 'validation_error');
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string) {
    super(message, 404, 'not_found');
  }
}

export class ExternalServiceError extends ServiceError {
  constructor(message: string) {
    super(message, 502, 'external_service_error');
  }
}
