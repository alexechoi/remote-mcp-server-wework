import "server-only";

import { z } from "zod";

import { authenticateWeWork, WeWorkClient } from "@/lib/wework/client";
import { getWeWorkCredentials } from "@/lib/wework/store";

async function clientForUser(uid: string) {
  const credentials = await getWeWorkCredentials(uid);
  if (!credentials) {
    throw new Error("Connect WeWork credentials in the dashboard first.");
  }
  const { token } = await authenticateWeWork(credentials.username, credentials.password);
  return new WeWorkClient(token);
}

const locationsInput = z.object({ city: z.string().min(1) });
const desksInput = z.object({
  location_uuid: z.string().optional(),
  city: z.string().optional(),
  date: z.string().optional()
});
const bookingsInput = z.object({
  past: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
});
const infoInput = z.object({
  location_uuid: z.string().optional(),
  city: z.string().optional(),
  name: z.string().optional(),
  amenities_only: z.boolean().optional()
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function workspacesFrom(raw: any): any[] {
  return raw?.getSharedWorkspaces?.workspaces ?? raw?.response?.workspaces ?? [];
}

async function resolveSpaces(client: WeWorkClient, input: { location_uuid?: string; city?: string; date: string }) {
  let locationUUIDs = input.location_uuid?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  if (!locationUUIDs.length && input.city) {
    const locations = ((await client.getLocationsByGeo(input.city)) as any).locationsByGeo ?? [];
    locationUUIDs = locations.map((location: any) => location.uuid).filter(Boolean);
  }
  if (!locationUUIDs.length) {
    throw new Error("location_uuid or city is required");
  }
  const result = await client.getAvailableSpaces(input.date, locationUUIDs);
  return workspacesFrom(result);
}

function compactBooking(booking: any) {
  const location = booking?.reservable?.location ?? {};
  return {
    uuid: booking?.uuid,
    date: booking?.startsAt?.slice?.(0, 10),
    start_time: booking?.startsAt,
    end_time: booking?.endsAt,
    location_name: location?.name,
    location_uuid: location?.uuid,
    address: location?.address?.line1,
    city: location?.address?.city,
    credits: booking?.creditOrder?.price ?? booking?.order?.subTotal?.amount,
    reservable_uuid: booking?.reservable?.uuid,
    reservable_type: booking?.reservable?.__typename
  };
}

export const toolSchemas = {
  locations: locationsInput,
  desks: desksInput,
  find_space: desksInput,
  bookings: bookingsInput,
  info: infoInput,
  me: z.object({ include_bootstrap: z.boolean().optional() }),
  calendar: z.object({}),
  quote: z.object({ date: z.string(), location_uuid: z.string().optional(), city: z.string().optional(), name: z.string().optional() }),
  book: z.object({ date: z.string(), location_uuid: z.string().optional(), city: z.string().optional(), name: z.string().optional() }),
  cancel_booking: z.object({ booking_uuid: z.string().min(1) })
};

export async function callWeWorkTool(uid: string, name: string, args: unknown) {
  const client = await clientForUser(uid);

  switch (name) {
    case "locations": {
      const input = locationsInput.parse(args);
      const result = (await client.getLocationsByGeo(input.city)) as any;
      return { items: result.locationsByGeo ?? [] };
    }
    case "desks":
    case "find_space": {
      const input = desksInput.parse(args);
      if (!input.location_uuid && !input.city) {
        throw new Error("location_uuid or city is required");
      }
      let locationUUIDs = input.location_uuid?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
      if (!locationUUIDs.length && input.city) {
        const locations = ((await client.getLocationsByGeo(input.city)) as any).locationsByGeo ?? [];
        locationUUIDs = locations.map((location: any) => location.uuid).filter(Boolean);
      }
      const result = await client.getAvailableSpaces(input.date || today(), locationUUIDs);
      return {
        items: workspacesFrom(result).map((space: any) => ({
          location: space?.location?.name,
          reservable_id: space?.uuid,
          location_id: space?.location?.uuid,
          available: space?.seat?.available,
          reservable_type: space?.reservable?.__typename,
          reservable_name: space?.reservable?.name,
          reservable_floor: space?.reservable?.floorName
        }))
      };
    }
    case "bookings": {
      const input = bookingsInput.parse(args);
      const result = input.past
        ? ((await client.getPastBookings(input.start_date, input.end_date)) as any)
        : ((await client.getUpcomingBookings()) as any);
      return { items: (result.WeWorkBookings ?? []).map(compactBooking) };
    }
    case "info": {
      const input = infoInput.parse(args);
      if (!input.location_uuid) {
        throw new Error("location_uuid is required for remote SaaS v1.");
      }
      return client.getLocationFeatures(input.location_uuid, input.amenities_only);
    }
    case "me":
      return client.getProfile();
    case "calendar":
      throw new Error("calendar is not available in the initial remote SaaS implementation.");
    case "quote":
    case "book": {
      const input = toolSchemas[name].parse(args) as { date: string; location_uuid?: string; city?: string; name?: string };
      const spaces = await resolveSpaces(client, input);
      if (spaces.length === 0) {
        throw new Error("no spaces found");
      }
      if (spaces.length > 1 && !input.name) {
        throw new Error("multiple spaces found; provide a more specific location_uuid");
      }
      const selected =
        input.name && spaces.length > 1
          ? spaces.find((space: any) => String(space?.location?.name ?? "").toLowerCase().includes(input.name!.toLowerCase()))
          : spaces[0];
      if (!selected) {
        throw new Error(`no space matched ${input.name}`);
      }
      const response = name === "quote" ? await client.getBookingQuote(input.date, selected) : await client.postBooking(input.date, selected);
      return {
        date: input.date,
        space_uuid: selected?.uuid,
        location_uuid: selected?.location?.uuid,
        location_name: selected?.location?.name,
        [name === "quote" ? "quote" : "booking"]: response
      };
    }
    case "cancel_booking": {
      const input = toolSchemas.cancel_booking.parse(args) as { booking_uuid: string };
      const upcoming = ((await client.getUpcomingBookings()) as any).WeWorkBookings ?? [];
      const booking = upcoming.find((item: any) => item?.uuid === input.booking_uuid);
      if (!booking) {
        throw new Error(`no upcoming booking found with uuid ${input.booking_uuid}`);
      }
      const request = cancelRequestFromBooking(booking);
      const response = await client.cancelBooking(request);
      return { booking_uuid: input.booking_uuid, request, response };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function cancelRequestFromBooking(booking: any) {
  const reservable = booking?.reservable ?? {};
  const location = reservable?.location ?? {};
  const bookingId = booking?.uuid;
  const bookingType = reservable?.__typename === "ConferenceRoom" ? 0 : reservable?.__typename === "PrivateOffice" ? 2 : 4;
  const bookingLocationType = location?.sourceType || (reservable?.__typename === "SharedWorkspace" ? 2 : 0);
  const startTime = formatCancelDateTime(booking?.startsAt);
  const endTime = formatCancelDateTime(booking?.endsAt);
  return {
    bookingId,
    bookingLocationType,
    creditsUsed: numericCredits(booking?.creditOrder?.price) ?? 0,
    startTime,
    endTime,
    locationId: location?.uuid,
    reservableId: reservable?.uuid,
    isBookingApprovalOn: Boolean(booking?.IsBookingApprovalOn ?? booking?.isBookingApprovalOn),
    bookingType,
    spaceId: reservable?.cwmSpaceId ? String(reservable.cwmSpaceId) : reservable?.uuid,
    cancellationNote: "",
    mailParams: {
      workspaceType: cancelWorkspaceType(reservable?.__typename),
      dayFormatted: formatCancelDay(booking?.startsAt),
      startTimeFormatted: startTime,
      endTimeFormatted: endTime,
      floorAddress: "",
      locationAddress: location?.address?.line1 ?? "",
      locationCountry: location?.address?.country ?? ""
    },
    reservationId: booking?.kubeBookingExternalReference || booking?.uuid
  };
}

function numericCredits(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return undefined;
}

function formatCancelDateTime(value: unknown) {
  if (typeof value !== "string" || value.length < 19) {
    return "";
  }
  return value.slice(0, 19) + ".000";
}

function formatCancelDay(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  const day = date.getDate();
  return `${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(date)}${ordinalSuffix(day)}`;
}

function ordinalSuffix(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function cancelWorkspaceType(typeName: unknown) {
  switch (typeName) {
    case "ConferenceRoom":
      return 0;
    case "PrivateOffice":
      return 2;
    case "SharedWorkspace":
      return 1;
    default:
      return typeName;
  }
}
