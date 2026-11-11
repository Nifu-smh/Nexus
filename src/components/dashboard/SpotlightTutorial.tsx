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
  position?: 'bottom' | 'top' | 'left' | 'right';
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
    position: 'top',
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
    position: 'bottom',
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
    position: 'bottom',
  },
];

interface SpotlightTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  steps?: SpotlightStep[];
}

/**
 * Smoothly scrolls the window so both the target element and its tutorial card are visible,
 * without obscuring either under fixed headers or beyond viewport bounds.
 */
const scrollToTarget = (element: Element, position?: SpotlightStep['position']) => {
  const style = window.getComputedStyle(element);
  if (style.position === 'fixed') {
    return;
  }

  const rect = element.getBoundingClientRect();
  const headerHeight = 72; // 64px header + safety buffer
  const cardEstimatedHeight = 280;
  const padding = 24;

  let needScroll = false;
  let targetScrollY = window.scrollY;

  const currentTop = rect.top;
  const currentBottom = rect.bottom;

  if (position === 'top') {
    const idealTop = headerHeight + cardEstimatedHeight + padding;
    if (Math.abs(currentTop - idealTop) > 30) {
      needScroll = true;
      targetScrollY = window.scrollY + (currentTop - idealTop);
    }
  } else if (position === 'bottom') {
    const idealTop = headerHeight + padding;
    if (currentTop < idealTop || currentBottom + cardEstimatedHeight + padding > window.innerHeight) {
      needScroll = true;
      targetScrollY = window.scrollY + (currentTop - idealTop);
    }
  } else {
    if (currentTop < headerHeight || currentBottom > window.innerHeight) {
      needScroll = true;
      const availableHeight = window.innerHeight - headerHeight;
      const idealTop = headerHeight + Math.max(padding, (availableHeight - rect.height) / 2);
      targetScrollY = window.scrollY + (currentTop - idealTop);
    }
  }

  if (needScroll) {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clampedScrollY = Math.max(0, Math.min(targetScrollY, maxScroll));
    window.scrollTo({
      top: clampedScrollY,
      behavior: 'smooth',
    });
  }
};

/**
 * Calculates collision-free positioning for the floating tutorial card.
 */
function calculateCardPosition(
  targetRect: DOMRect | null,
  cardWidth: number,
  cardHeight: number,
  preferredPosition: 'bottom' | 'top' | 'left' | 'right' = 'bottom'
): React.CSSProperties {
  if (!targetRect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${Math.min(cardWidth, window.innerWidth - 32)}px`,
      zIndex: 50,
    };
  }

  const padding = 16;
  const headerBuffer = 72;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const actualCardWidth = Math.min(cardWidth, vw - padding * 2);

  const spotlightBounds = {
    top: targetRect.top - 12,
    bottom: targetRect.bottom + 12,
    left: targetRect.left - 12,
    right: targetRect.right + 12,
  };

  const intersectsSpotlight = (top: number, left: number) => {
    const cardRect = {
      top,
      bottom: top + cardHeight,
      left,
      right: left + actualCardWidth,
    };
    return !(
      cardRect.right <= spotlightBounds.left ||
      cardRect.left >= spotlightBounds.right ||
      cardRect.bottom <= spotlightBounds.top ||
      cardRect.top >= spotlightBounds.bottom
    );
  };

  const testSide = (side: 'bottom' | 'top' | 'left' | 'right') => {
    let top = 0;
    let left = 0;

    if (side === 'bottom') {
      top = targetRect.bottom + padding;
      left = targetRect.left + targetRect.width / 2 - actualCardWidth / 2;
      left = Math.max(padding, Math.min(left, vw - actualCardWidth - padding));
      const inViewport = top + cardHeight <= vh - padding && top >= headerBuffer;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    if (side === 'top') {
      top = targetRect.top - cardHeight - padding;
      left = targetRect.left + targetRect.width / 2 - actualCardWidth / 2;
      left = Math.max(padding, Math.min(left, vw - actualCardWidth - padding));
      const inViewport = top >= headerBuffer;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    if (side === 'right') {
      left = targetRect.right + padding;
      top = Math.max(headerBuffer, Math.min(targetRect.top + 20, vh - cardHeight - padding));
      const inViewport = left + actualCardWidth <= vw - padding;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    if (side === 'left') {
      left = targetRect.left - actualCardWidth - padding;
      top = Math.max(headerBuffer, Math.min(targetRect.top + 20, vh - cardHeight - padding));
      const inViewport = left >= padding;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    return { top: 0, left: 0, fits: false, overlapArea: 999 };
  };

  const priorityOrder: ('bottom' | 'top' | 'left' | 'right')[] = [preferredPosition];
  const allSides: ('bottom' | 'top' | 'left' | 'right')[] = ['bottom', 'top', 'right', 'left'];
  for (const s of allSides) {
    if (!priorityOrder.includes(s)) priorityOrder.push(s);
  }

  for (const side of priorityOrder) {
    const candidate = testSide(side);
    if (candidate.fits) {
      return {
        position: 'fixed',
        top: `${Math.round(candidate.top)}px`,
        left: `${Math.round(candidate.left)}px`,
        width: `${actualCardWidth}px`,
        zIndex: 50,
      };
    }
  }

  for (const side of priorityOrder) {
    const candidate = testSide(side);
    if (candidate.overlapArea === 0) {
      const safeTop = Math.max(headerBuffer, Math.min(candidate.top, vh - cardHeight - padding));
      const safeLeft = Math.max(padding, Math.min(candidate.left, vw - actualCardWidth - padding));
      return {
        position: 'fixed',
        top: `${Math.round(safeTop)}px`,
        left: `${Math.round(safeLeft)}px`,
        width: `${actualCardWidth}px`,
        zIndex: 50,
      };
    }
  }

  // Fallback: centered
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${actualCardWidth}px`,
    zIndex: 50,
  };
}

export const SpotlightTutorial: React.FC<SpotlightTutorialProps> = ({
  isOpen,
  onClose,
  onComplete,
  steps = WORKSPACE_TUTORIAL_STEPS,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 480,
    height: 320,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const currentStep = steps[currentStepIndex];

  // Measure card dimensions dynamically with ResizeObserver
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCardSize({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [currentStepIndex, isOpen]);

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

    // Smoothly scroll into view
    const el = currentStep ? document.querySelector(currentStep.targetSelector) : null;
    if (el) {
      scrollToTarget(el, currentStep?.position);
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

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none">
      {/* Stitch Translucent Backdrop with click-to-dismiss */}
      <div
        onClick={handleSkip}
        className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        style={{ zIndex: 40 }}
      />

      {/* Target Area Spotlight Illumination Ring & Crystal Clear Cutout */}
      {targetRect && (
        <>
          {/* Deep dark perimeter cutout with electric border and brightened interior */}
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
                0 0 0 9999px rgba(6, 14, 32, 0.82),
                0 0 25px 4px rgba(128, 131, 255, 0.65),
                0 0 60px 10px rgba(78, 222, 163, 0.25),
                inset 0 0 15px rgba(192, 193, 255, 0.2)
              `,
              border: '2px solid rgba(192, 193, 255, 0.9)',
              backdropFilter: 'brightness(1.4) contrast(1.12) saturate(1.2)',
              WebkitBackdropFilter: 'brightness(1.4) contrast(1.12) saturate(1.2)',
              background: 'radial-gradient(ellipse at center, rgba(192, 193, 255, 0.12) 0%, transparent 80%)',
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
      )}

      {/* Floating Tutorial Step Card — Exact Stitch Specification */}
      <div
        ref={cardRef}
        style={{
          ...calculateCardPosition(
            targetRect,
            cardSize.width,
            cardSize.height,
            currentStep?.position
          ),
          transition: isScrolling ? 'none' : 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="pointer-events-auto relative w-full max-w-lg rounded-3xl bg-surface-container-high/95 backdrop-blur-xl border border-primary/40 p-6 sm:p-7 shadow-2xl shadow-indigo-500/20 animate-entrance text-on-surface"
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
