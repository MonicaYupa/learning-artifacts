interface AnalysisExerciseProps {
  prompt: string
  material: string
}

export default function AnalysisExercise({ prompt, material }: AnalysisExerciseProps) {
  return (
    <div className="animate-fadeInUp rounded-xl border-2 border-primary-500 bg-white p-6 sm:p-8">
      {/* Exercise Prompt (Instructions) */}
      <div className="mb-6">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900 sm:text-lg">
          <span className="font-semibold">Your Task: </span>
          {prompt}
        </p>
      </div>

      {/* Material to Analyze */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
          Material to Analyze
        </h4>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">
          {material}
        </div>
      </div>
    </div>
  )
}
