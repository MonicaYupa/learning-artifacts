import { memo } from 'react'
import { useModuleContext } from '@/contexts/ModuleContext'

/**
 * Mobile tab navigation component
 * Allows switching between exercise and workspace views on mobile
 */
function MobileTabNavigation() {
  const { activeTab, setActiveTab } = useModuleContext()
  return (
    <nav
      className="border-b border-neutral-700 bg-neutral-850 sm:hidden"
      aria-label="Exercise navigation"
    >
      <div className="flex" role="tablist">
        <button
          onClick={() => setActiveTab('exercise')}
          role="tab"
          aria-selected={activeTab === 'exercise'}
          aria-controls="exercise-panel"
          className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'exercise'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Exercise
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          role="tab"
          aria-selected={activeTab === 'editor'}
          aria-controls="editor-panel"
          className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'editor'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Workspace
        </button>
      </div>
    </nav>
  )
}

export default memo(MobileTabNavigation)
