export default function LoadingModuleCard() {
  return (
    <div className="mt-4 flex w-full items-center justify-between rounded-lg border-2 border-primary-500/30 bg-neutral-800/30 p-4">
      <div className="flex items-center gap-3">
        {/* Icon placeholder with pulse animation */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500/20">
          <div className="h-6 w-6 animate-pulse rounded-md bg-primary-400/50" />
        </div>

        {/* Content skeleton */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title skeleton */}
          <div className="h-4 w-48 animate-pulse rounded bg-neutral-600/50" />

          {/* Subtitle skeleton */}
          <div className="h-3 w-32 animate-pulse rounded bg-neutral-600/50" />
        </div>
      </div>

      {/* Loading spinner on the right */}
      <div className="flex-shrink-0">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    </div>
  )
}
