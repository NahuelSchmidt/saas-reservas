/** Convierte un teléfono en un email sintético estable, para poder reusar el modelo User (que requiere email único) sin pedirle cuenta al jugador. */
export function guestEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel-${digits}@guest.sistema-padel.local`;
}
