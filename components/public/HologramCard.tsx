import { QrImage } from "./QrImage";

interface HologramCardProps {
  code: string;
  validationUrl: string;
  brandName: string;
  collectionNumber: string;
}

// Position of the QR's white square inside public/binkis.png, as a percentage
// of the artwork. The static QR in the art is a placeholder; we overlay the
// real per-code QR on top of it so each piece scans to its own /v/<code>.
const QR_BOX = { left: "36%", top: "51.6%", width: "29.4%", height: "29.8%" };

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
