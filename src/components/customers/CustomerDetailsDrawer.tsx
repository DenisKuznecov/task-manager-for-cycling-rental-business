"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/ui/components/Badge";
import { DataLoadError } from "@/src/components/DataLoadError";
import { DetailsDrawer } from "@/src/components/DetailsDrawer";
import type { CustomerDetails, DestinationStatus } from "@/src/lib/customers";
import { isoDateToDdMmYyyy } from "@/src/utils/date-format";
import { CustomerDetailsDrawerSkeleton } from "./CustomerDetailsDrawerSkeleton";

interface CustomerDetailsDrawerProps {
  customer: CustomerDetails | null;
  error: string | null;
  loading?: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <span className="mb-3 block text-caption-bold font-caption-bold uppercase text-subtext-color">
        {title}
      </span>
      <div className="flex w-full flex-col items-start gap-3">{children}</div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex-none text-body font-body text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right text-body font-medium text-slate-900">
        {children}
      </span>
    </div>
  );
}

function DestinationRow({ label, destination }: { label: string; destination: DestinationStatus }) {
  if (destination.status === "green") {
    return <DetailRow label={label}><Badge variant="success">Landed</Badge></DetailRow>;
  }
  if (destination.status === "red") {
    return (
      <div className="flex w-full flex-col items-start gap-1">
        <DetailRow label={label}><Badge variant="error">Failed</Badge></DetailRow>
        {destination.error ? <span className="text-caption font-caption text-error-700">{destination.error}</span> : null}
      </div>
    );
  }
  return <DetailRow label={label}><Badge variant="neutral">Not synced</Badge></DetailRow>;
}

function orderLabel(order: CustomerDetails["orders"][number]) {
  return order.order_number == null ? "Order" : `Order #${order.order_number}`;
}

export function CustomerDetailsDrawer({ customer, error, loading = false }: CustomerDetailsDrawerProps) {
  const router = useRouter();
  const handleCloseComplete = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("customer");
    const queryString = params.toString();
    router.push(queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname, { scroll: false });
  }, [router]);

  return (
    <DetailsDrawer
      open={true}
      onCloseComplete={handleCloseComplete}
      title={loading ? "Customer details" : customer?.name ?? "Customer details"}
      bodyClassName="bg-slate-50"
    >
      {loading ? <CustomerDetailsDrawerSkeleton /> : error ? (
        <DataLoadError
          title="Couldn't load customer details"
          message={
            process.env.NODE_ENV === "development"
              ? error
              : "We couldn't load customer details. Please try again."
          }
        />
      ) : !customer ? (
        <span className="text-body font-body text-subtext-color">Customer not found. It may have been removed or you may not have access to it.</span>
      ) : (
        <>
          <Section title="Identity">
            <DetailRow label="Name">{customer.name}</DetailRow>
            <DetailRow label="Email">{customer.email}</DetailRow>
            <DetailRow label="Phone">{customer.phone}</DetailRow>
            <DetailRow label="Birthday">{customer.birthday ? isoDateToDdMmYyyy(customer.birthday) : "—"}</DetailRow>
          </Section>
          <Section title="Address">
            {customer.address.every((part) => part.value === "—") ? (
              <span className="text-body font-body text-subtext-color">No address is on file.</span>
            ) : customer.address.map((part) => <DetailRow key={part.label} label={part.label}>{part.value}</DetailRow>)}
          </Section>
          <Section title="Destination sync">
            <DestinationRow label="Google" destination={customer.google} />
            <DestinationRow label="Holded" destination={customer.holded} />
            <DestinationRow label="Mailchimp" destination={customer.mailchimp} />
          </Section>
          <Section title="Orders">
            {customer.orders.length === 0 ? <span className="text-body font-body text-subtext-color">This customer has no orders.</span> : customer.orders.map((order) => (
              <Link key={order.id} href={`/orders?order=${order.id}`} className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-brand-700 hover:bg-slate-50">
                <span className="text-body-bold font-body-bold">{orderLabel(order)}</span>
                <span className="text-caption font-caption text-subtext-color">{order.status ?? "—"} · {order.created_at ? isoDateToDdMmYyyy(order.created_at) : "—"}</span>
              </Link>
            ))}
          </Section>
          <Section title="Bike fits">
            {customer.bikeFits.length === 0 ? <span className="text-body font-body text-subtext-color">This customer has no bike fits.</span> : customer.bikeFits.map((fit) => (
              <Link key={fit.id} href={`/bike-fits/${fit.id}`} className="text-body-bold font-body-bold text-brand-700 hover:underline">#{fit.fit_number} · {fit.fit_label} · {isoDateToDdMmYyyy(fit.date_of_fit)}</Link>
            ))}
          </Section>
          <Section title="Partner history">
            {customer.partners.length === 0 ? <span className="text-body font-body text-subtext-color">No qualifying partner order exists.</span> : customer.partners.map((partner) => <span key={partner.id} className="text-body font-body text-default-font">{partner.name}</span>)}
          </Section>
        </>
      )}
    </DetailsDrawer>
  );
}
