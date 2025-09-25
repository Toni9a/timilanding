export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
  
  export function smoothScrollTo(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }
  
  export function getScrollProgress(scrollY: number, windowHeight: number, multiplier: number = 1.5): number {
    return clamp(scrollY / (windowHeight * multiplier), 0, 1);
  }