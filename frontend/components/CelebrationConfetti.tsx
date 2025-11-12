interface CelebrationConfettiProps {
  show: boolean
  particleCount?: number
}

export default function CelebrationConfetti({
  show,
  particleCount = 20,
}: CelebrationConfettiProps) {
  if (!show) return null

  const colors = ['#d97757', '#f1875e', '#f7b099', '#fbd2c3']

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg"
      role="status"
      aria-live="polite"
      aria-label="Next exercise unlocked"
    >
      {/* Confetti particles */}
      <div className="absolute inset-0">
        {[...Array(particleCount)].map((_, i) => (
          <div
            key={i}
            className="confetti-particle absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10%',
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              backgroundColor: colors[Math.floor(Math.random() * colors.length)],
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${Math.random() * 2 + 2.5}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
