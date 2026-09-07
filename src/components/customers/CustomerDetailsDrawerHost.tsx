"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchCustomerDetails } from "@/src/lib/customers/actions/customer-details-actions";
import type { CustomerDetails } from "@/src/lib/customers";
import { CustomerDetailsDrawer } from "./CustomerDetailsDrawer";

type FetchState = {
  customerId: string | null;
  customer: CustomerDetails | null;
  error: string | null;
  loading: boolean;
};

const INITIAL_FETCH_STATE: FetchState = {
  customerId: null,
  customer: null,
  error: null,
  loading: false,
};

export function CustomerDetailsDrawerHost() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer");
  const [fetchState, setFetchState] = useState<FetchState>(INITIAL_FETCH_STATE);

  useEffect(() => {
    if (!customerId) {
      setFetchState(INITIAL_FETCH_STATE);
      return;
    }

    let cancelled = false;
    setFetchState({ customerId, customer: null, error: null, loading: true });

    fetchCustomerDetails(customerId)
      .then(({ customer, error }) => {
        if (!cancelled) {
          setFetchState({ customerId, customer, error, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchState({
            customerId,
            customer: null,
            error: "Unable to load customer details.",
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (!customerId) return null;

  const isCurrentCustomer = fetchState.customerId === customerId;

  return (
    <CustomerDetailsDrawer
      customer={isCurrentCustomer ? fetchState.customer : null}
      error={isCurrentCustomer ? fetchState.error : null}
      loading={fetchState.loading || !isCurrentCustomer}
    />
  );
}
