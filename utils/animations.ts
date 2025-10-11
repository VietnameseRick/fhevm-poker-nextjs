import anime from 'animejs';

// Fade in animation on scroll
export const fadeInOnScroll = (element: HTMLElement | null, delay = 0) => {
  if (!element) return;
  
  anime({
    targets: element,
    opacity: [0, 1],
    translateY: [50, 0],
    duration: 1000,
    delay,
    easing: 'easeOutExpo',
  });
};

// Stagger fade in for children
export const staggerFadeIn = (elements: NodeListOf<Element> | Element[], delay = 0) => {
  anime({
    targets: Array.from(elements),
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
    delay: anime.stagger(100, { start: delay }),
    easing: 'easeOutExpo',
  });
};

// Card flip animation
export const cardFlip = (element: HTMLElement | null) => {
  if (!element) return;
  
  anime({
    targets: element,
    rotateY: [0, 360],
    duration: 1000,
    easing: 'easeInOutQuad',
  });
};

// Float animation
export const floatAnimation = (element: HTMLElement | null) => {
  if (!element) return;
  
  anime({
    targets: element,
    translateY: [-20, 20],
    duration: 3000,
    loop: true,
    direction: 'alternate',
    easing: 'easeInOutSine',
  });
};

// Number counter animation
export const counterAnimation = (
  element: HTMLElement | null,
  targetValue: number,
  duration = 2000
) => {
  if (!element) return;
  
  const obj = { count: 0 };
  
  anime({
    targets: obj,
    count: targetValue,
    duration,
    easing: 'easeOutExpo',
    round: 1,
    update: () => {
      if (element) {
        element.textContent = obj.count.toString();
      }
    },
  });
};

// Glow pulse animation
export const glowPulse = (element: HTMLElement | null) => {
  if (!element) return;
  
  anime({
    targets: element,
    scale: [1, 1.05, 1],
    duration: 2000,
    loop: true,
    easing: 'easeInOutQuad',
  });
};

// Slide in from left
export const slideInLeft = (element: HTMLElement | null, delay = 0) => {
  if (!element) return;
  
  anime({
    targets: element,
    opacity: [0, 1],
    translateX: [-100, 0],
    duration: 1000,
    delay,
    easing: 'easeOutExpo',
  });
};

// Slide in from right
export const slideInRight = (element: HTMLElement | null, delay = 0) => {
  if (!element) return;
  
  anime({
    targets: element,
    opacity: [0, 1],
    translateX: [100, 0],
    duration: 1000,
    delay,
    easing: 'easeOutExpo',
  });
};

// Scale in animation
export const scaleIn = (element: HTMLElement | null, delay = 0) => {
  if (!element) return;
  
  anime({
    targets: element,
    opacity: [0, 1],
    scale: [0.5, 1],
    duration: 800,
    delay,
    easing: 'easeOutElastic(1, .6)',
  });
};

// Create timeline for sequential animations
export const createTimeline = () => {
  return anime.timeline({
    easing: 'easeOutExpo',
  });
};

// Particle animation (for background effects)
export const particleFloat = (elements: NodeListOf<Element> | Element[]) => {
  Array.from(elements).forEach((element, index) => {
    anime({
      targets: element,
      translateY: [
        { value: -20, duration: 1500 },
        { value: 20, duration: 1500 },
      ],
      translateX: [
        { value: -10, duration: 2000 },
        { value: 10, duration: 2000 },
      ],
      opacity: [
        { value: 0.3, duration: 1000 },
        { value: 0.7, duration: 1000 },
      ],
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
      delay: index * 200,
    });
  });
};
