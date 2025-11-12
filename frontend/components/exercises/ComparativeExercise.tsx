interface ComparativeExerciseProps {
  prompt: string
  options: string[]
}

export default function ComparativeExercise({ prompt, options }: ComparativeExerciseProps) {
  return (
    <div className="animate-fadeInUp rounded-xl border-2 border-primary-500 bg-white p-6 sm:p-8">
      {/* Exercise Prompt (Instructions) */}
      <div className="mb-6">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900 sm:text-lg">
          <span className="font-semibold">Your Task: </span>
          {prompt}
        </p>
      </div>

      {/* Options to Compare */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
          Options to Compare
        </h4>
        <ul className="space-y-3">
          {options.map((option, idx) => (
            <li
              key={idx}
              className={`animate-slideInRight flex items-start gap-3 rounded-lg border border-cream-200 bg-cream-50 p-3.5 stagger-${Math.min(idx + 1, 5)}`}
            >
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-bold text-white shadow-md ring-2 ring-primary-200">
                {idx + 1}
              </span>
              <span className="text-sm font-medium leading-relaxed text-neutral-900">{option}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
