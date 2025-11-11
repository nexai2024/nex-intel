'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFirstName?: string;
}

export function OnboardingModal({ isOpen, onClose, userFirstName }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const router = useRouter();

  const onboardingSteps = [
    {
      title: 'Welcome to CompeteIQ!',
      subtitle: `Hi ${userFirstName || 'there'}! Let's get you started with evidence-first competitive intelligence.`,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            CompeteIQ automatically generates comprehensive competitive analysis reports with verifiable source citations.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What makes CompeteIQ different:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Every claim includes verifiable citations</li>
              <li>• Automated analysis saves you hours of research</li>
              <li>• Industry-specific insights tailored to your market</li>
              <li>• Change detection to monitor competitive movements</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'Create Your First Project',
      subtitle: 'Projects help you organize competitive analysis by market or product.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Start by creating a project for your product or service. This helps CompeteIQ focus the analysis on your specific competitive landscape.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Project inputs help CompeteIQ understand:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Your product description and value proposition</li>
              <li>• Key features and keywords to track</li>
              <li>• Known competitors to analyze</li>
              <li>• Target market and customer segments</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => {
                router.push('/projects/new');
                onClose();
              }}
              className="btn btn-primary"
            >
              Create Your First Project
            </button>
          </div>
        </div>
      )
    },
    {
      title: 'Run Your First Analysis',
      subtitle: 'Watch as CompeteIQ discovers, extracts, and synthesizes competitive intelligence.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            CompeteIQ follows a 5-step process to generate comprehensive competitive analysis:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <h5 className="font-medium">Discovery</h5>
                <p className="text-sm text-gray-600">Searches for relevant competitive information</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <h5 className="font-medium">Extraction</h5>
                <p className="text-sm text-gray-600">Analyzes sources for capabilities, pricing, and features</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <h5 className="font-medium">Synthesis</h5>
                <p className="text-sm text-gray-600">Identifies patterns, gaps, and market standards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <h5 className="font-medium">Quality Assurance</h5>
                <p className="text-sm text-gray-600">Validates findings and checks data quality</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">5</div>
              <div>
                <h5 className="font-medium">Report Generation</h5>
                <p className="text-sm text-gray-600">Creates comprehensive report with citations</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Tip:</strong> Each analysis consumes 1 credit from your monthly allowance. Free users get 3 credits per month.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Explore Your Interactive Report',
      subtitle: 'Navigate between different views and use interactive features.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Your reports come with powerful features to help you get the most out of your competitive intelligence:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2">📊 Tabbed Navigation</h5>
              <p className="text-sm text-gray-600">Jump between executive summary, competitors, capabilities, pricing, and more.</p>
            </div>
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2">🔍 Interactive Viewer</h5>
              <p className="text-sm text-gray-600">Search, expand/collapse sections, and copy content easily.</p>
            </div>
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2">📋 Source Citations</h5>
              <p className="text-sm text-gray-600">Click to view the actual sources behind every claim.</p>
            </div>
            <div className="border rounded-lg p-4">
              <h5 className="font-medium mb-2">📤 Export Options</h5>
              <p className="text-sm text-gray-600">Download as PDF, export to Notion, or share with your team.</p>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Pro tip:</strong> Use the interactive viewer to search for specific terms and copy sections for presentations.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Enable Real-time Monitoring',
      subtitle: 'Never miss important competitive changes with automated monitoring.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            CompeteIQ can automatically re-run your analysis to detect changes in the competitive landscape:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <h5 className="font-medium">Weekly Analysis</h5>
                <p className="text-sm text-gray-600">Automatically runs every 7 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <h5 className="font-medium">Change Detection</h5>
                <p className="text-sm text-gray-600">Compares new data against previous runs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <div>
                <h5 className="font-medium">Smart Alerts</h5>
                <p className="text-sm text-gray-600">Notifies you of significant changes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div>
                <h5 className="font-medium">Email Notifications</h5>
                <p className="text-sm text-gray-600">Get alerts delivered to your inbox</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What you'll be alerted about:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• New competitors entering your market</li>
              <li>• Price changes from existing competitors</li>
              <li>• New features and capabilities</li>
              <li>• Significant content updates</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set! 🎉",
      subtitle: 'Start leveraging evidence-first competitive intelligence today.',
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <p className="text-gray-600">
              You now have everything you need to start generating comprehensive competitive intelligence reports.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Quick Start Checklist:</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completedSteps.has(1)}
                  onChange={() => toggleStep(1)}
                  className="rounded"
                />
                <span className="text-sm">Create your first project</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completedSteps.has(2)}
                  onChange={() => toggleStep(2)}
                  className="rounded"
                />
                <span className="text-sm">Run your first analysis</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completedSteps.has(3)}
                  onChange={() => toggleStep(3)}
                  className="rounded"
                />
                <span className="text-sm">Explore your interactive report</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completedSteps.has(4)}
                  onChange={() => toggleStep(4)}
                  className="rounded"
                />
                <span className="text-sm">Enable monitoring for a project</span>
              </label>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                router.push('/projects/new');
                onClose();
              }}
              className="btn btn-primary"
            >
              Create Your First Project
            </button>
            <button
              onClick={() => {
                router.push('/dashboard');
                onClose();
              }}
              className="btn btn-ghost"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }
  ];

  function toggleStep(stepNumber: number) {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  }

  function nextStep() {
    if (step < onboardingSteps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  }

  function prevStep() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  function skipOnboarding() {
    localStorage.setItem('CompeteIQ-onboarding-completed', 'true');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-fuchsia-600 rounded-lg"></div>
              <h2 className="text-xl font-semibold">{onboardingSteps[step].title}</h2>
            </div>
            <button
              onClick={skipOnboarding}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
          </div>
          <p className="text-gray-600 mt-2">{onboardingSteps[step].subtitle}</p>

          {/* Progress dots */}
          <div className="flex gap-2 mt-4">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full ${
                  index === step
                    ? 'bg-indigo-600'
                    : index < step
                    ? 'bg-indigo-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {onboardingSteps[step].content}
        </div>

        <div className="p-6 border-t flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className={`btn ${step === 0 ? 'invisible' : 'btn-ghost'}`}
          >
            Previous
          </button>

          <div className="text-sm text-gray-500">
            Step {step + 1} of {onboardingSteps.length}
          </div>

          <button
            onClick={nextStep}
            className="btn btn-primary"
          >
            {step === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}