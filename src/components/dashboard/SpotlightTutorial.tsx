import React, { useState, useEffect, useRef } from 'react';

export interface TutorialFeature {
  icon: string;
  color?: 'primary' | 'secondary' | 'tertiary';
  text: string;
}

export interface SpotlightStep {
  targetSelector: string;
  badge: string;
  icon: string;
  title: string;
  description: string;
  features: TutorialFeature[];
  nextBtnLabel?: string;
}

/**
 * Canonical 3-Step Workspace Selection Tutorial from Stitch design:
 * Screen: NEXUS — Workspace Selection (Tutorial Tour)
 */
export const WORKSPACE_TUTORIAL_STEPS: SpotlightStep[] = [
  {
    targetSelector: '[data-tour="workspaces-section"]',
    badge: 'Step 1 of 3 · Workspaces Tour',
    icon: 'rocket_launch',
    title: 'Your Engineering Workspaces',
    description: 'Isolated, production-grade environments connected to your GitHub repositories, sprint Kanban boards, and Supabase auth pipelines. Launch straight into sprint cycles or review open PRs in seconds.',
    features: [
      { icon: 'bolt', color: 'primary', text: 'Real-time Git & CI/CD build telemetry' },
      { icon: 'analytics', color: 'secondary', text: 'Live velocity tracking & sprint burndown metrics' },
      { icon: 'groups', color: 'tertiary', text: 'Collaborative multi-agent developer sandboxes' },
    ],
    nextBtnLabel: 'Next: Sprint Telemetry',
  },
  {
    targetSelector: '[data-tour="metrics-row"]',
    badge: 'Step 2 of 3 · Workspaces Tour',
    icon: 'analytics',
    title: 'Live Sprint Telemetry & Metrics',
    description: 'Track connected engineering environments, sprint tasks currently in flight, and pending GitHub pull request reviews at a single glance with 99.98% SLA reliability.',
    features: [
      { icon: 'monitoring', color: 'primary', text: 'Automated sprint velocity and throughput progress' },
      { icon: 'checklist_rtl', color: 'secondary', text: 'Granular status breakdown (To Do, Active, Done)' },
      { icon: 'alt_route', color: 'tertiary', text: 'Real-time GitHub & Supabase cloud synchronization' },
    ],
    nextBtnLabel: 'Next: Workspace Provisioning',
  },
  {
    targetSelector: '[data-tour="action-hub"]',
    badge: 'Step 3 of 3 · Workspaces Tour',
    icon: 'add_circle',
    title: 'Launch or Join Team Workspaces',
    description: 'Spin up a dedicated engineering workspace in under 60 seconds with pre-configured agile templates, or paste an enterprise invite token to join your team instantly.',
    features: [
      { icon: 'add_box', color: 'primary', text: 'Rapid setup with Agile Sprint Kanban templates' },
      { icon: 'vpn_key', color: 'secondary', text: 'Instant access via 6-digit workspace invite codes' },
      { icon: 'security', color: 'tertiary', text: 'Role-based access control (Owner vs Member)' },
    ],
    nextBtnLabel: 'Finish Tour & Get Started',
  },
];

interface SpotlightTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  steps?: SpotlightStep[];
}

/**
 * Smoothly scrolls the window so the target element is framed comfortably in the viewport.
 */
const scrollToTarget = (element: Element) => {
  const style = window.getComputedStyle(element);
  if (style.position === 'fixed') return;

  const rect = element.getBoundingClientRect();
  const headerHeight = 72; // Clearance for top fixed header
  const currentTop = rect.top;

  // Frame the target comfortably in view below header
  const idealTop = headerHeight + Math.max(20, (window.innerHeight - headerHeight - rect.height) / 2);
  const targetScrollY = window.scrollY + (currentTop - idealTop);

  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clampedScrollY = Math.max(0, Math.min(targetScrollY, maxScroll));

  window.scrollTo({
    top: clampedScrollY,
    behavior: 'smooth',
  });
};

export const SpotlightTutorial: React.FC<SpotlightTutorialProps> = ({
  isOpen,
  onClose,
  onComplete,
  steps = WORKSPACE_TUTORIAL_STEPS,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const currentStep = steps[currentStepIndex];

  // Target positioning and smooth scroll sync
  useEffect(() => {
    if (!isOpen) return;

    let animFrameId: number;
    let isMounted = true;

    const updateRect = () => {
      if (!currentStep) return;
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    updateRect();

    // Smoothly scroll target into view
    const el = currentStep ? document.querySelector(currentStep.targetSelector) : null;
    if (el) {
      scrollToTarget(el);
    }

    // Animation frame tracking during scroll
    let lastY = window.scrollY;
    let stableCount = 0;

    const trackScroll = () => {
      if (!isMounted) return;
      const curY = window.scrollY;
      if (curY !== lastY) {
        lastY = curY;
        stableCount = 0;
        updateRect();
      } else {
        stableCount++;
      }
      if (stableCount < 40) {
        animFrameId = requestAnimationFrame(trackScroll);
      }
    };
    animFrameId = requestAnimationFrame(trackScroll);

    const handleScrollOrResize = () => {
      updateRect();
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameId);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, currentStepIndex, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen || !currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // Determine smart non-overlapping vertical placement for tutorial card
  const getCardPositionStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      };
    }

    const vh = window.innerHeight;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // If target is in lower half of screen, position card near top
    if (targetCenterY > vh * 0.45) {
      return {
        position: 'fixed',
        top: '84px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
      };
    }

    // If target is in upper half of screen, position card near bottom
    return {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
    };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Click-away backdrop: Clean translucent tint without ANY blur */}
      <div
        onClick={handleSkip}
        className="fixed inset-0 pointer-events-auto transition-opacity duration-300 z-40 bg-transparent"
      />

      {/* Target Area Spotlight Illumination Ring & Crystal Clear Cutout */}
      {targetRect ? (
        <>
          {/* 
            The single box-shadow cutout:
            - ZERO shadow inside the box: Target is 100% UNTOUCHED, crystal clear, sharp, NO blur!
            - Outside the box: Soft 65% dark tint smoothly dims the rest of the page (no blur!).
          */}
          <div
            style={{
              position: 'fixed',
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              zIndex: 42,
              pointerEvents: 'none',
              borderRadius: '24px',
              boxShadow: `
                0 0 0 9999px rgba(6, 14, 32, 0.65),
                0 0 25px 4px rgba(128, 131, 255, 0.65),
                0 0 50px 8px rgba(78, 222, 163, 0.25)
              `,
              border: '2px solid rgba(192, 193, 255, 0.95)',
              background: 'transparent',
              transition: isScrolling ? 'none' : 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Animated beam pulse */}
          <div
            style={{
              position: 'fixed',
              top: targetRect.top - 12,
              left: targetRect.left - 12,
              width: targetRect.width + 24,
              height: targetRect.height + 24,
              zIndex: 41,
              pointerEvents: 'none',
              borderRadius: '28px',
              border: '1.5px dashed rgba(192, 193, 255, 0.6)',
              transition: isScrolling ? 'none' : 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="animate-pulse pointer-events-none"
          />
        </>
      ) : (
        /* Fallback subtle dark tint when target is not yet located */
        <div
          onClick={handleSkip}
          className="fixed inset-0 bg-[#060e20]/65 pointer-events-auto transition-opacity z-40"
        />
      )}

      {/* Floating Tutorial Step Card — Exact Stitch Specification */}
      <div
        style={getCardPositionStyle()}
        className="pointer-events-auto w-[92vw] max-w-lg rounded-3xl bg-surface-container-high/95 backdrop-blur-xl border border-primary/40 p-6 sm:p-8 shadow-2xl shadow-indigo-500/20 animate-entrance text-on-surface"
      >
        {/* Floating Top Badge with Live Dot */}
        <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-[11px] font-semibold tracking-wide flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-surface-tint pulse-ring-dot" />
          <span>{currentStep.badge}</span>
        </div>

        {/* Top-Right Dismiss Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
          title="Dismiss tour (Esc)"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Card Header: Icon + Title */}
        <div className="pt-1">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner shrink-0">
              <span className="material-symbols-outlined text-[22px]">{currentStep.icon}</span>
            </div>
            <h3 className="font-display font-bold text-lg text-on-surface tracking-tight">
              {currentStep.title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-on-surface-variant mb-4 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Stitch Feature Highlights Checklist */}
          {currentStep.features && currentStep.features.length > 0 && (
            <div className="grid grid-cols-1 gap-2 mb-4 p-3 rounded-2xl bg-surface-container-lowest/60 border border-outline-variant/20">
              {currentStep.features.map((feature, idx) => {
                const colorClass =
                  feature.color === 'secondary'
                    ? 'bg-secondary-container/20 text-secondary'
                    : feature.color === 'tertiary'
                    ? 'bg-tertiary-container/20 text-tertiary'
                    : 'bg-primary-container/20 text-primary';
                return (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-on-surface">
                    <span
                      className={`w-6 h-6 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 shadow-inner`}
                    >
                      <span className="material-symbols-outlined text-[14px]">{feature.icon}</span>
                    </span>
                    <span className="text-on-surface font-medium">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step Indicator & Action Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-6 bg-primary-container shadow-sm'
                      : 'w-2 bg-surface-container-highest'
                  }`}
                />
              ))}
              <span className="text-[11px] text-outline ml-2 font-medium">
                {currentStepIndex + 1} of {steps.length}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-2 rounded-xl text-outline hover:text-on-surface text-xs font-medium transition-colors cursor-pointer"
              >
                Skip Tour
              </button>

              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-on-primary-container text-xs font-semibold flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
              >
                <span>
                  {currentStep.nextBtnLabel ||
                    (currentStepIndex === steps.length - 1 ? 'Finish Tour & Get Started' : 'Next Step')}
                </span>
                <span className="material-symbols-outlined text-[16px]">
                  {currentStepIndex === steps.length - 1 ? 'check' : 'arrow_forward'}
                </span>
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint Bar */}
          <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-outline border-t border-outline-variant/10">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono text-[10px]">
                →
              </span>{' '}
              Next tip
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono text-[10px]">
                Esc
              </span>{' '}
              Dismiss anytime
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
