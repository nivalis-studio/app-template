import { ImageResponse } from 'next/og';

export function generateImageMetadata() {
  return [
    { id: '16', size: { width: 16, height: 16 }, contentType: 'image/png' },
    { id: '32', size: { width: 32, height: 32 }, contentType: 'image/png' },
    { id: '48', size: { width: 48, height: 48 }, contentType: 'image/png' },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const px = Number(await id);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        color: '#EF4A2A',
        borderRadius: '50%',
      }}
    >
      <svg
        aria-hidden='true'
        fill='none'
        height={px}
        viewBox='0 0 384 384'
        width={px}
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M354 110.004L263.472 265.793C257.125 276.718 241.251 276.718 234.887 265.793L206.268 216.564C203.324 211.5 197.885 208.38 192 208.38C186.115 208.38 180.676 211.5 177.732 216.564L153.886 257.586C147.987 267.747 137.082 274 125.301 274H30L120.511 118.194C126.875 107.269 142.749 107.269 149.113 118.194L192 192.002L230.114 126.4C236.013 116.257 246.9 110.004 258.699 110.004H354Z'
          fill='currentColor'
        />
      </svg>
    </div>,
    { width: px, height: px },
  );
}
