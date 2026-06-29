import { QrImage } from "./QrImage";

interface HologramCardProps {
  code: string;
  validationUrl: string;
  brandName: string;
  collectionNumber: string;
}

// Position of the blank QR square inside public/binkis.png, as a percentage of
// the artwork (564x615; the square is 182x182 px). We render the real per-code
// QR into this slot so each piece scans to its own /v/<code>.
const QR_BOX = { left: "37.77%", top: "52.52%", width: "32.27%", height: "29.59%" };

export function HologramCard({ code, validationUrl }: HologramCardProps) {
  return (
    <div className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl shadow-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/binkis.png"
        alt={`Hologram BinKis - codigo ${code}`}
        className="block h-auto w-full select-none"
        draggable={false}
      />

      {/* Live QR, overlaid exactly over the placeholder QR in the artwork */}
      <div
        className="absolute flex items-center justify-center overflow-hidden rounded-[10%] bg-white"
        style={{
          left: QR_BOX.left,
          top: QR_BOX.top,
          width: QR_BOX.width,
          height: QR_BOX.height,
        }}
      >
        <div className="aspect-square w-[86%]">
          <QrImage
            value={validationUrl}
            size={320}
            alt={`QR del codigo ${code}`}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
