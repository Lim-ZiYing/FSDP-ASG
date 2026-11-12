// Owner: Declan – FSDP-43 pickup QR. The customer shows this at the collection point;
// the hawker can scan it (or just read the big order number) to hand over the right bag.
import { QRCodeSVG } from 'qrcode.react';

export default function PickupQr({ orderNo, pointName }) {
  return (
    <div className="pickup-qr">
      <div className="pickup-qr-code">
        <QRCodeSVG value={`HAWKER-EMENU:${orderNo}`} size={132} fgColor="#2B1D14" title={`Pickup QR code for order ${orderNo}`} />
      </div>
      <div className="grow">
        <p className="eyebrow">Show at pick-up</p>
        <p className="pickup-qr-no">{orderNo}</p>
        <p className="muted">{pointName ? `Show this at ${pointName}` : 'Show this when you collect'}</p>
      </div>
    </div>
  );
}