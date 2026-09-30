import QRCode from "qrcode";

import { memberQrPayload } from "@/lib/attendance/qr";

export async function MemberQrCard({ memberId, memberCode }: { memberId: string; memberCode: string }) {
  const svg = await QRCode.toString(memberQrPayload(memberId), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#10261F", light: "#FFFFFF" },
  });

  return (
    <article className="rounded-xl border bg-[var(--surface)] p-5">
      <h2 className="font-semibold">Member QR card</h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Present this code at check-in. It contains no contact details.</p>
      <div aria-label={`QR code for ${memberCode}`} className="mt-4 grid w-fit place-items-center rounded-lg border bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-xs font-medium text-[var(--muted-foreground)]">{memberCode}</p>
    </article>
  );
}
