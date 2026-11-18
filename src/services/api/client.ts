import type { z } from "zod";
import type { ApiResult } from "@/types";
import { API_BASE_URL, MOCK_LATENCY_MS, REQUEST_TIMEOUT_MS, USE_MOCK_DATA } from "./config";

export type ApiErrorKind = "network" | "timeout" | "http" | "contract" | "config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions<S extends z.ZodType> {
  /** Path relative to NEXT_PUBLIC_API_BASE_URL, e.g. "/suppliers". */
  path: string;
  /** Contract the response must satisfy. */
  schema: S;
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown | FormData;
}

function buildUrl(path: string, query?: RequestOptions<z.ZodType>["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const suffix = params.size ? `?${params}` : "";
  return `${API_BASE_URL}${path}${suffix}`;
}

/** Calls the live backend and validates the response against its contract. */
async function requestLive<S extends z.ZodType>(options: RequestOptions<S>): Promise<z.infer<S>> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL is not set. Configure the backend URL or enable mock mode.",
      "config",
    );
  }

  const isForm = options.body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(options.path, options.query), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body && !isForm ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? (isForm ? (options.body as FormData) : JSON.stringify(options.body)) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`The backend did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`, "timeout");
    }
    throw new ApiError("Could not reach the backend. Check that it is running and allows this origin (CORS).", "network");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError(`The backend returned ${response.status} ${response.statusText} for ${options.path}.`, "http", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(`The response from ${options.path} was not valid JSON.`, "contract");
  }

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join(".") : "response";
    throw new ApiError(
      `The response from ${options.path} does not match the API contract (${where}: ${issue?.message ?? "invalid"}). See docs/API_CONTRACTS.md.`,
      "contract",
    );
  }
  return parsed.data;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The single switch between demonstration and live data.
 *
 * Every service call goes through here. In mock mode `mock()` supplies the
 * payload; otherwise the backend is called. Components never know which one
 * answered — they only read `meta.source` to label the data honestly.
 */
export async function resolve<S extends z.ZodType>(
  options: RequestOptions<S> & { mock: () => z.infer<S> | Promise<z.infer<S>> },
): Promise<ApiResult<z.infer<S>>> {
  if (USE_MOCK_DATA) {
    await delay(MOCK_LATENCY_MS);
    return {
      data: await options.mock(),
      meta: { source: "mock", fetchedAt: new Date().toISOString(), origin: "Mock provider (src/lib/mock-data)" },
    };
  }
  const data = await requestLive(options);
  return { data, meta: { source: "live", fetchedAt: new Date().toISOString(), origin: API_BASE_URL } };
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
