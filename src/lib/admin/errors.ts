import { ZodError } from "zod";

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class MfaRequiredError extends Error {
  readonly status = 403;
  constructor(message = "Multi-factor authentication is required for this staff account") {
    super(message);
    this.name = "MfaRequiredError";
  }
}

export class ConflictError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Invalid input", issues: error.flatten().fieldErrors }, { status: 400 });
  }
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof MfaRequiredError ||
    error instanceof ConflictError ||
    error instanceof ValidationError
  ) {
    return Response.json({ error: error.message, code: error.name }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "The request could not be completed." }, { status: 500 });
}
