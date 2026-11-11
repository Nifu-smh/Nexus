import React, { useState, useEffect, useRef } from 'react';

export interface SpotlightStep {
  targetSelector: string;
  title: string;
  badge: string;
  description: string;
  position?: 'bottom' | 'top' | 'left' | 'right';
}

const DEFAULT_STEPS: SpotlightStep[] = [
  {
    targetSelector: '[data-tour="header-nav"]',
    badge: 'Step 1 of 5 • Workspace Navigation',
    title: 'Welcome to NEXUS Cloud',
    description: 'Switch between multi-tenant engineering workspaces, inspect active sprint velocity, or access technical specifications from the central directory.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="sidebar-nav"]',
    badge: 'Step 2 of 5 • Compact Navigation Rail',
    title: 'Icon Navigation Rail',
    description: 'Quickly access Directory, Sprints, Velocity telemetry, Specifications, and real-time sync with our streamlined icon rail.',
    position: 'right',
  },
  {
    targetSelector: '[data-tour="action-hub"]',
    badge: 'Step 3 of 5 • Quick Actions',
    title: 'Provision or Join Workspaces',
    description: 'Launch an isolated workspace in under 60 seconds with dedicated Git repositories and Agile Kanban, or enter an invite code to join your team.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="metrics-row"]',
    badge: 'Step 4 of 5 • Real-Time Telemetry',
    title: 'Sprint Telemetry & Metrics',
    description: 'Track connected environments, sprint tasks currently in flight, and pending GitHub pull request reviews at a single glance with 99.98% SLA.',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="workspaces-section"]',
    badge: 'Step 5 of 5 • Sprint Execution',
    title: 'Your Engineering Workspaces',
    description: 'Each workspace provides an isolated sandbox with Kanban boards, customizable sprint cycles, and real-time git sync. Click "Launch Workspace" to begin!',
    position: 'top',
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
    // Fixed elements (like top header or sidebar rail) never need window scrolling
    return;
  }

  const rect = element.getBoundingClientRect();
  const headerHeight = 72; // 64px header + safety buffer
  const cardEstimatedHeight = 230;
  const padding = 20;

  let needScroll = false;
  let targetScrollY = window.scrollY;

  const currentTop = rect.top;
  const currentBottom = rect.bottom;

  if (position === 'top') {
    // We want the tutorial card placed above the element without overlapping.
    // Ideal top position for element is headerHeight + cardEstimatedHeight + padding (~322px).
    const idealTop = headerHeight + cardEstimatedHeight + padding;
    if (Math.abs(currentTop - idealTop) > 25) {
      needScroll = true;
      targetScrollY = window.scrollY + (currentTop - idealTop);
    }
  } else if (position === 'bottom') {
    // We want the tutorial card placed below the element.
    // Ideal top position for element is just below the fixed header.
    const idealTop = headerHeight + padding;
    if (currentTop < idealTop || currentBottom + cardEstimatedHeight + padding > window.innerHeight) {
      needScroll = true;
      targetScrollY = window.scrollY + (currentTop - idealTop);
    }
  } else {
    // 'right' or 'left': center the element vertically in the available viewport
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
 * Calculates collision-free positioning for the floating tutorial card, ensuring
 * it never overlays the spotlighted target element while staying within viewport bounds.
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
      zIndex: 100,
    };
  }

  const padding = 16;
  const headerBuffer = 72; // Clearance for fixed top header
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Responsive card width capping to viewport
  const actualCardWidth = Math.min(cardWidth, vw - padding * 2);

  // Spotlight boundary with safety buffer around target
  const spotlightBounds = {
    top: targetRect.top - 12,
    bottom: targetRect.bottom + 12,
    left: targetRect.left - 12,
    right: targetRect.right + 12,
  };

  // Helper to check if card rectangle intersects spotlight boundary
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

  // Test candidate position for each side
  const testSide = (side: 'bottom' | 'top' | 'left' | 'right'): { top: number; left: number; fits: boolean; overlapArea: number } => {
    let top = 0;
    let left = 0;

    if (side === 'bottom') {
      top = targetRect.bottom + padding;
      left = targetRect.left + (targetRect.width / 2) - (actualCardWidth / 2);
      left = Math.max(padding, Math.min(left, vw - actualCardWidth - padding));
      const inViewport = top + cardHeight <= vh - padding && top >= headerBuffer;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    if (side === 'top') {
      top = targetRect.top - cardHeight - padding;
      left = targetRect.left + (targetRect.width / 2) - (actualCardWidth / 2);
      left = Math.max(padding, Math.min(left, vw - actualCardWidth - padding));
      const minTop = targetRect.top > headerBuffer ? headerBuffer : padding;
      const inViewport = top >= minTop;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    if (side === 'right') {
      left = targetRect.right + padding;
      // If target is tall (e.g. sidebar rail), align near top of target so icons remain visible beside card
      if (targetRect.height > cardHeight * 1.5) {
        top = Math.max(headerBuffer, targetRect.top + 24);
      } else {
        top = targetRect.top + (targetRect.height / 2) - (cardHeight / 2);
      }
      top = Math.max(headerBuffer, Math.min(top, vh - cardHeight - padding));
      const inViewport = left + actualCardWidth <= vw - padding;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    if (side === 'left') {
      left = targetRect.left - actualCardWidth - padding;
      if (targetRect.height > cardHeight * 1.5) {
        top = Math.max(headerBuffer, targetRect.top + 24);
      } else {
        top = targetRect.top + (targetRect.height / 2) - (cardHeight / 2);
      }
      top = Math.max(headerBuffer, Math.min(top, vh - cardHeight - padding));
      const inViewport = left >= padding;
      const intersects = intersectsSpotlight(top, left);
      return { top, left, fits: inViewport && !intersects, overlapArea: intersects ? 1 : 0 };
    }

    return { top: 0, left: 0, fits: false, overlapArea: 999 };
  };

  // Priority order starting with preferredPosition
  const priorityOrder: ('bottom' | 'top' | 'left' | 'right')[] = [preferredPosition];
  const allSides: ('bottom' | 'top' | 'left' | 'right')[] = ['bottom', 'top', 'right', 'left'];
  for (const s of allSides) {
    if (!priorityOrder.includes(s)) {
      priorityOrder.push(s);
    }
  }

  // Find first side that fits in viewport with ZERO overlap
  for (const side of priorityOrder) {
    const candidate = testSide(side);
    if (candidate.fits) {
      return {
        position: 'fixed',
        top: `${Math.round(candidate.top)}px`,
        left: `${Math.round(candidate.left)}px`,
        width: `${actualCardWidth}px`,
        zIndex: 100,
      };
    }
  }

  // Fallback: pick candidate with ZERO overlap even if near edge
  for (const side of priorityOrder) {
    const candidate = testSide(side);
    if (candidate.overlapArea === 0) {
      const safeTop = Math.max(padding, Math.min(candidate.top, vh - cardHeight - padding));
      const safeLeft = Math.max(padding, Math.min(candidate.left, vw - actualCardWidth - padding));
      return {
        position: 'fixed',
        top: `${Math.round(safeTop)}px`,
        left: `${Math.round(safeLeft)}px`,
        width: `${actualCardWidth}px`,
        zIndex: 100,
      };
    }
  }

  // Last-resort fallback: place where available space is largest
  const spaceBelow = vh - targetRect.bottom;
  const spaceAbove = targetRect.top - headerBuffer;
  const spaceRight = vw - targetRect.right;
  const spaceLeft = targetRect.left;

  let bestSide: 'bottom' | 'top' | 'right' | 'left' = 'bottom';
  const maxSpace = Math.max(spaceBelow, spaceAbove, spaceRight, spaceLeft);
  if (maxSpace === spaceAbove && spaceAbove > 140) bestSide = 'top';
  else if (maxSpace === spaceRight && spaceRight > 180) bestSide = 'right';
  else if (maxSpace === spaceLeft && spaceLeft > 180) bestSide = 'left';

  const bestCandidate = testSide(bestSide);
  const clampedTop = Math.max(padding, Math.min(bestCandidate.top, vh - cardHeight - padding));
  const clampedLeft = Math.max(padding, Math.min(bestCandidate.left, vw - actualCardWidth - padding));

  return {
    position: 'fixed',
    top: `${Math.round(clampedTop)}px`,
    left: `${Math.round(clampedLeft)}px`,
    width: `${actualCardWidth}px`,
    zIndex: 100,
  };
}

export const SpotlightTutorial: React.FC<SpotlightTutorialProps> = ({
  isOpen,
  onClose,
  onComplete,
  steps = DEFAULT_STEPS,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 420,
    height: 220,
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
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(prev => {
            if (
              prev &&
              Math.abs(prev.top - rect.top) < 0.5 &&
              Math.abs(prev.left - rect.left) < 0.5 &&
              Math.abs(prev.width - rect.width) < 0.5 &&
              Math.abs(prev.height - rect.height) < 0.5
            ) {
              return prev;
            }
            return rect;
          });
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    // Immediate initial sync
    const el = currentStep ? document.querySelector(currentStep.targetSelector) : null;
    if (el) {
      const initialRect = el.getBoundingClientRect();
      if (initialRect.width > 0 && initialRect.height > 0) {
        setTargetRect(initialRect);
      }
      scrollToTarget(el, currentStep.position);
    }

    // Keep syncing continuously during smooth scroll animation
    const startTime = performance.now();
    const trackScroll = () => {
      if (!isMounted) return;
      updateRect();
      if (performance.now() - startTime < 750) {
        animFrameId = requestAnimationFrame(trackScroll);
      }
    };
    animFrameId = requestAnimationFrame(trackScroll);

    // Event listeners for window resize and scroll
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

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none">
      {/* Target Area Spotlight Illumination Ring & Crystal Clear Cutout */}
      {targetRect ? (
        <>
          {/* Deep dark backdrop surrounding the spotlight with pristine clear window */}
          <div
            style={{
              position: 'fixed',
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              zIndex: 92,
              pointerEvents: 'none',
              borderRadius: '20px',
              // Giant box shadow creates the darkened perimeter while leaving the target 100% visible and un-obscured
              boxShadow: `
                0 0 0 9999px rgba(6, 14, 32, 0.85),
                0 0 25px 4px rgba(128, 131, 255, 0.6),
                0 0 60px 10px rgba(78, 222, 163, 0.25)
              `,
              border: '2px solid rgba(192, 193, 255, 0.9)',
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
              zIndex: 91,
              pointerEvents: 'none',
              borderRadius: '24px',
              border: '1.5px dashed rgba(192, 193, 255, 0.5)',
              transition: isScrolling ? 'none' : 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="animate-pulse pointer-events-none"
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-surface-container-lowest/88 backdrop-blur-sm transition-opacity"
          style={{ zIndex: 90 }}
        />
      )}

      {/* Floating Tutorial Step Card — Positioned dynamically without overlaying spotlighted target */}
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
        className="rounded-3xl bg-surface-container-high/95 backdrop-blur-2xl border border-outline-variant/40 p-5 sm:p-6 shadow-2xl animate-entrance flex flex-col gap-4 text-on-surface"
      >
        {/* Header row: Badge + Skip Tutorial / Close button */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-primary-container/20 text-primary font-semibold text-xs tracking-wide">
            {currentStep.badge}
          </span>
          <button
            onClick={handleSkip}
            className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-highest transition-colors flex items-center gap-1 text-xs cursor-pointer"
            title="Skip tutorial (Esc)"
          >
            <span className="font-medium">Skip</span>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-lg text-on-surface tracking-tight">
            {currentStep.title}
          </h3>
          <p className="font-body text-xs leading-relaxed text-on-surface-variant">
            {currentStep.description}
          </p>
        </div>

        {/* Step indicator dots & Navigation buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 mt-1">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStepIndex
                    ? 'w-6 bg-primary'
                    : 'w-1.5 bg-outline-variant/60'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3 py-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary font-semibold text-xs shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <span>{currentStepIndex === steps.length - 1 ? 'Got it!' : 'Next'}</span>
              <span className="material-symbols-outlined text-[16px]">
                {currentStepIndex === steps.length - 1 ? 'check' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
