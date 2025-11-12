interface FrameworkExerciseProps {
  prompt: string
  scaffold?: { [key: string]: string }
  material?: string
}

export default function FrameworkExercise({ prompt, scaffold, material }: FrameworkExerciseProps) {
  return (
    <div className="animate-fadeInUp rounded-xl border-2 border-primary-500 bg-white p-6 sm:p-8">
      {/* Exercise Prompt (Instructions) */}
      <div className="mb-6">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900 sm:text-lg">
          <span className="font-semibold">Your Task: </span>
          {prompt}
        </p>
      </div>

      {/* Task Materials Section */}
      <div className="space-y-5">
        {scaffold && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
              Framework Structure
            </h4>
            <div className="space-y-3">
              {Object.entries(scaffold).map(([key, value], idx) => (
                <div
                  key={key}
                  className={`animate-slideInRight group/item relative overflow-hidden rounded-lg border-l-4 border-primary-500 bg-cream-50 p-4 stagger-${Math.min(idx + 1, 5)}`}
                >
                  <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-xs font-bold text-primary-700">
                    {idx + 1}
                  </div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-800">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {key}
                  </div>
                  <div className="pr-10 text-sm leading-relaxed text-neutral-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {material && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
              Reference Material
            </h4>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">
              {material}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
