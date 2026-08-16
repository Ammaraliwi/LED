export function customerCanAccessPrivateMedia(input: { uploaderUserId: number | null; currentUserId: number; linkedToCustomerBooking: boolean }): boolean {
  return input.uploaderUserId === input.currentUserId || input.linkedToCustomerBooking;
}
