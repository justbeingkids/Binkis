import { z } from "zod";
import { MX_STATES } from "@/lib/mx-states";

/**
 * A winner's shipping address, in parts.
 *
 * It used to be one free-text box, and a box invites "Colibri 48 Hermosillo"
 * with no colonia and no postal code, which only turns up as a problem when
 * the parcel is already at the carrier. Each part is required except the
 * interior number. No "references" field: the client asked to collect as
 * little about the customer as the delivery needs.
 */
export const addressSchema = z.object({
  street: z.string().trim().min(2, "Calle requerida").max(120),
  extNumber: z.string().trim().min(1, "Numero exterior requerido").max(20),
  intNumber: z.string().trim().max(20).optional().default(""),
  colonia: z.string().trim().min(2, "Colonia requerida").max(120),
  postalCode: z.string().trim().regex(/^\d{5}$/, "El codigo postal lleva 5 digitos"),
  city: z.string().trim().min(2, "Ciudad requerida").max(120),
  state: z.enum(MX_STATES, { message: "Selecciona un estado" }),
});

export type AddressParts = z.infer<typeof addressSchema>;

/** One line, the way a Mexican shipping label reads. */
export function composeAddress(a: AddressParts): string {
  const number = a.intNumber ? `${a.extNumber} Int. ${a.intNumber}` : a.extNumber;
  return `${a.street} ${number}, Col. ${a.colonia}, C.P. ${a.postalCode}, ${a.city}, ${a.state}`;
}
