import { toFa } from '@utils/persian';

export function stripFraction(day: number, length: number): number {
  if (!(day > 0) || !(length > 0)) { return 0; }
  return Math.min(day / length, 1);
}

export function stripLabel(day: number, length: number): string {
  return `روز ${toFa(day)} از میانگین ${toFa(length)} روزه‌ی چرخه‌هایت`;
}
