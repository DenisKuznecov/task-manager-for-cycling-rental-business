"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/components/Button";
import { DropdownMenu } from "@/ui/components/DropdownMenu";
import { IconButton } from "@/ui/components/IconButton";
import { Table } from "@/ui/components/Table";
import { FeatherArrowRight } from "@subframe/core";
import { FeatherEdit2 } from "@subframe/core";
import { FeatherFlag } from "@subframe/core";
import { FeatherMoreHorizontal } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

interface Booking {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  bike: string;
  period: string;
  orderSize: string;
}

const RECENT_BOOKINGS: Booking[] = [
  {
    id: "1",
    name: "John Doe",
    avatar:
      "https://res.cloudinary.com/subframe/image/upload/v1711417513/shared/kwut7rhuyivweg8tmyzl.jpg",
    phone: "+34 612 345 901",
    bike: "Specialized S-Works SL8",
    period: "14 Apr 2026 - 16 Apr 2026",
    orderSize: "€1,250",
  },
  {
    id: "2",
    name: "Alice Smith",
    avatar:
      "https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif",
    phone: "+34 612 345 901",
    bike: "Focus Izalco Max 8.9",
    period: "8 Apr 2026 - 12 Apr 2026",
    orderSize: "€600",
  },
  {
    id: "3",
    name: "Robert Johnson",
    avatar:
      "https://res.cloudinary.com/subframe/image/upload/v1711417514/shared/ubsk7cs5hnnaj798efej.jpg",
    phone: "+34 612 345 901",
    bike: "Focus Aventura Step-thru",
    period: "2 Apr 2026 - 11 Apr 2026",
    orderSize: "€450",
  },
  {
    id: "4",
    name: "Emma Wilson",
    avatar:
      "https://res.cloudinary.com/subframe/image/upload/v1711417512/shared/m0kfajqpwkfief00it4v.jpg",
    phone: "+34 612 345 901",
    bike: "MMR Adrenaline 00",
    period: "15 Apr 2026 - 17 Apr 2026",
    orderSize: "€1,000",
  },
  {
    id: "5",
    name: "Michael Brown",
    avatar:
      "https://res.cloudinary.com/subframe/image/upload/v1711417512/shared/btvntvzhdbhpulae3kzk.jpg",
    phone: "+34 612 345 901",
    bike: "Pinarello Dogma F",
    period: "14 Apr 2026 - 16 Apr 2026",
    orderSize: "€225",
  },
];

export function RecentBookings() {
  const router = useRouter();
  const bookings = RECENT_BOOKINGS.slice(0, 5);

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2">
        <span className="grow shrink-0 basis-0 text-heading-3 font-heading-3 text-default-font">
          Recent Bookings
        </span>
        <Button
          variant="neutral-secondary"
          iconRight={<FeatherArrowRight />}
          onClick={() => router.push("/partner/bookings")}
        >
          View All
        </Button>
      </div>
      <div className="flex w-full flex-col items-start gap-6 overflow-hidden overflow-x-auto mobile:overflow-auto mobile:max-w-full">
        <Table
          header={
            <Table.HeaderRow>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Phone</Table.HeaderCell>
              <Table.HeaderCell>Bike</Table.HeaderCell>
              <Table.HeaderCell>Period</Table.HeaderCell>
              <Table.HeaderCell>Order Size</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.HeaderRow>
          }
        >
          {bookings.map((booking) => (
            <Table.Row key={booking.id}>
              <Table.Cell>
                <div className="flex items-center gap-2">
                  <Avatar size="small" image={booking.avatar} square={true}>
                    {booking.name.charAt(0)}
                  </Avatar>
                  <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                    {booking.name}
                  </span>
                </div>
              </Table.Cell>
              <Table.Cell>
                <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                  {booking.phone}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className="text-body font-body text-neutral-500">
                  {booking.bike}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className="whitespace-nowrap text-body font-body text-neutral-500">
                  {booking.period}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className="text-body font-body text-neutral-500">
                  {booking.orderSize}
                </span>
              </Table.Cell>
              <Table.Cell>
                <div className="flex grow shrink-0 basis-0 items-center justify-end">
                  <SubframeCore.DropdownMenu.Root>
                    <SubframeCore.DropdownMenu.Trigger asChild={true}>
                      <IconButton
                        icon={<FeatherMoreHorizontal />}
                        onClick={() => {}}
                      />
                    </SubframeCore.DropdownMenu.Trigger>
                    <SubframeCore.DropdownMenu.Portal>
                      <SubframeCore.DropdownMenu.Content
                        side="bottom"
                        align="end"
                        sideOffset={4}
                        asChild={true}
                      >
                        <DropdownMenu>
                          <DropdownMenu.DropdownItem>
                            Favorite
                          </DropdownMenu.DropdownItem>
                          <DropdownMenu.DropdownItem icon={<FeatherEdit2 />}>
                            Edit
                          </DropdownMenu.DropdownItem>
                          <DropdownMenu.DropdownItem icon={<FeatherFlag />}>
                            Report
                          </DropdownMenu.DropdownItem>
                        </DropdownMenu>
                      </SubframeCore.DropdownMenu.Content>
                    </SubframeCore.DropdownMenu.Portal>
                  </SubframeCore.DropdownMenu.Root>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table>
      </div>
    </div>
  );
}
