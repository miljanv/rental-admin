import { AsyncLocalStorage } from 'node:async_hooks';

/** Where the current request came from, for the audit log. Set for every API request. */
export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const getRequestContext = (): RequestContext | undefined => storage.getStore();

export const runWithRequestContext = <T>(context: RequestContext, work: () => T): T =>
  storage.run(context, work);
