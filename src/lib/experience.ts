import { experience } from "@/data/experience";

/** Años completos desde el primer rol registrado hasta `now`. */
export function getYearsOfExperience(now: Date = new Date()): number {
  const earliest = experience
    .map((item) => new Date(`${item.startDate}-01T00:00:00Z`))
    .reduce((min, date) => (date < min ? date : min));

  let years = now.getUTCFullYear() - earliest.getUTCFullYear();
  if (now.getUTCMonth() < earliest.getUTCMonth()) years -= 1;
  return Math.max(0, years);
}
