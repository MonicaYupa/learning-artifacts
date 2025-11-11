import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 22 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pixel art robot head - flat top, centered vertically */}
        <rect x="4" y="2.5" width="14" height="8" fill="#d97757" />
        {/* Eyes */}
        <rect x="6" y="4.5" width="1" height="2" fill="#1f2328" />
        <rect x="15" y="4.5" width="1" height="2" fill="#1f2328" />
        {/* Arms */}
        <rect x="2" y="6.5" width="2" height="2" fill="#d97757" />
        <rect x="18" y="6.5" width="2" height="2" fill="#d97757" />
        {/* Body/legs - four legs with more space between center legs */}
        <rect x="6" y="10.5" width="1" height="2" fill="#d97757" />
        <rect x="9" y="10.5" width="1" height="2" fill="#d97757" />
        <rect x="12" y="10.5" width="1" height="2" fill="#d97757" />
        <rect x="15" y="10.5" width="1" height="2" fill="#d97757" />
      </svg>
    ),
    {
      ...size,
    }
  )
}
