import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodError } from 'zod';

export const sendValidationError = (
  reply: FastifyReply,
  request: FastifyRequest,
  error: ZodError,
  message: string,
) =>
  reply.status(400).send({
    code: 'VALIDATION_ERROR',
    message,
    statusCode: 400,
    details: error.flatten().fieldErrors,
    requestId: request.id,
  });

export const sendNotFound = (reply: FastifyReply, request: FastifyRequest, message: string) =>
  reply.status(404).send({
    code: 'NOT_FOUND',
    message,
    statusCode: 404,
    requestId: request.id,
  });

export const sendConflict = (reply: FastifyReply, request: FastifyRequest, message: string) =>
  reply.status(409).send({
    code: 'CONFLICT',
    message,
    statusCode: 409,
    requestId: request.id,
  });

export const sendForbidden = (reply: FastifyReply, request: FastifyRequest, message: string) =>
  reply.status(403).send({
    code: 'FORBIDDEN',
    message,
    statusCode: 403,
    requestId: request.id,
  });

export const sendBusinessError = (
  reply: FastifyReply,
  request: FastifyRequest,
  code: string,
  message: string,
  statusCode: number,
  details?: Record<string, unknown>,
) =>
  reply.status(statusCode).send({
    code,
    message,
    statusCode,
    ...(details ? { details } : {}),
    requestId: request.id,
  });

export const sendInternalError = (reply: FastifyReply, request: FastifyRequest, message: string) =>
  reply.status(500).send({
    code: 'INTERNAL_ERROR',
    message,
    statusCode: 500,
    requestId: request.id,
  });
