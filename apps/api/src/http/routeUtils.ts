import type { NextFunction, Request, Response } from "express";

export const asyncRoute =
  (route: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    route(req, res).catch(next);

export const compactPayload = (data: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  );
