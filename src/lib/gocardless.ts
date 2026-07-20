import "server-only";

// Minimal GoCardless REST client for the Billing Request flow.
// Docs: https://developer.gocardless.com/api-reference

const BASE_URLS = {
  live: "https://api.gocardless.com",
  sandbox: "https://api-sandbox.gocardless.com",
} as const;

function baseUrl() {
  const env = process.env.GOCARDLESS_ENVIRONMENT ?? "sandbox";
  return BASE_URLS[env === "live" ? "live" : "sandbox"];
}

async function gc<T>(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "GOCARDLESS_ACCESS_TOKEN is not set — online payments aren't configured yet.",
    );
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "GoCardless-Version": "2015-07-06",
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GoCardless ${init.method ?? "GET"} ${path} failed (${res.status}): ${detail}`);
  }

  return (await res.json()) as T;
}

type BillingRequest = {
  id: string;
  status: string;
  links: { mandate_request_mandate?: string; customer?: string };
};

export async function createMandateBillingRequest(): Promise<BillingRequest> {
  const data = await gc<{ billing_requests: BillingRequest }>("/billing_requests", {
    method: "POST",
    body: {
      billing_requests: {
        mandate_request: { scheme: "bacs", currency: "GBP" },
      },
    },
  });
  return data.billing_requests;
}

export async function createBillingRequestFlow(options: {
  billingRequestId: string;
  redirectUri: string;
  exitUri: string;
  prefilledCustomer?: {
    given_name?: string;
    family_name?: string;
    email?: string;
  };
}): Promise<{ authorisation_url: string }> {
  const data = await gc<{ billing_request_flows: { authorisation_url: string } }>(
    "/billing_request_flows",
    {
      method: "POST",
      body: {
        billing_request_flows: {
          redirect_uri: options.redirectUri,
          exit_uri: options.exitUri,
          prefilled_customer: options.prefilledCustomer,
          links: { billing_request: options.billingRequestId },
        },
      },
    },
  );
  return data.billing_request_flows;
}

export async function getBillingRequest(id: string): Promise<BillingRequest> {
  const data = await gc<{ billing_requests: BillingRequest }>(`/billing_requests/${id}`);
  return data.billing_requests;
}

export async function createPayment(options: {
  mandateId: string;
  amountPence: number;
  description: string;
  idempotencyKey: string;
}): Promise<GcPaymentDetail> {
  const data = await gc<{ payments: GcPaymentDetail }>("/payments", {
    method: "POST",
    idempotencyKey: options.idempotencyKey,
    body: {
      payments: {
        amount: options.amountPence,
        currency: "GBP",
        description: options.description,
        links: { mandate: options.mandateId },
      },
    },
  });
  return data.payments;
}

export async function getPayment(id: string): Promise<
  GcPaymentDetail & {
    links: { mandate?: string; subscription?: string };
  }
> {
  const data = await gc<{
    payments: GcPaymentDetail & {
      links: { mandate?: string; subscription?: string };
    };
  }>(`/payments/${id}`);
  return data.payments;
}

export type GcPaymentDetail = {
  id: string;
  amount: number;
  status: string;
  charge_date: string;
  description: string | null;
};

// Everything ever collected (or scheduled) against a mandate — covers both
// the single pay-in-full payment and monthly subscription collections.
export async function listPaymentsForMandate(
  mandateId: string,
): Promise<GcPaymentDetail[]> {
  const data = await gc<{ payments: GcPaymentDetail[] }>(
    `/payments?mandate=${encodeURIComponent(mandateId)}&limit=100`,
  );
  return data.payments;
}

// Cancels everything tied to this mandate — any active subscription and
// any not-yet-submitted payments. Used when a player is removed with a
// live Direct Debit, so the family doesn't keep getting charged.
export async function cancelMandate(id: string): Promise<void> {
  await gc(`/mandates/${id}/actions/cancel`, { method: "POST", body: {} });
}

export async function createSubscription(options: {
  mandateId: string;
  amountPence: number;
  count: number;
  name: string;
  idempotencyKey: string;
}): Promise<{ id: string }> {
  const data = await gc<{ subscriptions: { id: string } }>("/subscriptions", {
    method: "POST",
    idempotencyKey: options.idempotencyKey,
    body: {
      subscriptions: {
        amount: options.amountPence,
        currency: "GBP",
        interval_unit: "monthly",
        count: options.count,
        name: options.name,
        links: { mandate: options.mandateId },
      },
    },
  });
  return data.subscriptions;
}
