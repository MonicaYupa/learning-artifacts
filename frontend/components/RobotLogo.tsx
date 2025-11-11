export default function RobotLogo() {
  return (
    <svg
      viewBox="0 0 20 14"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pixel art robot head - flat top */}
      <rect x="4" y="0" width="12" height="8" fill="#d97757" />
      {/* Eyes */}
      <rect x="6" y="2" width="1" height="2" fill="#1f2328" />
      <rect x="13" y="2" width="1" height="2" fill="#1f2328" />
      {/* Arms */}
      <rect x="2" y="4" width="2" height="2" fill="#d97757" />
      <rect x="16" y="4" width="2" height="2" fill="#d97757" />
      {/* Body/legs - four legs with more space between center legs */}
      <rect x="5" y="8" width="1" height="2" fill="#d97757" />
      <rect x="7" y="8" width="1" height="2" fill="#d97757" />
      <rect x="12" y="8" width="1" height="2" fill="#d97757" />
      <rect x="14" y="8" width="1" height="2" fill="#d97757" />
    </svg>
  )
}
