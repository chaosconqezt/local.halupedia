import React, { useState, useEffect, useRef } from 'react';

const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя1234567890!@#$%^&*";

export const AnimatedText = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState(text);
  const charsRef = useRef<{ target: string; current: string; phase: number; age: number; isSpace: boolean }[]>([]);
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(performance.now());
  const animatingRef = useRef(true);

  // When text updates (stream buffered sentences arrive), we update characters.
  useEffect(() => {
    const currentChars = charsRef.current;
    let changed = false;

    if (text.length !== currentChars.length || text !== currentChars.map(c => c.target).join('')) {
      const newChars: typeof currentChars = [];
      for (let i = 0; i < text.length; i++) {
        const target = text[i];
        if (i < currentChars.length && currentChars[i].target === target) {
          newChars.push(currentChars[i]);
        } else {
          const isSpace = /^\s$/.test(target);
          newChars.push({
            target,
            current: isSpace ? target : ' ', 
            phase: 0,
            age: 0,
            isSpace
          });
          changed = true;
        }
      }
      charsRef.current = newChars;
    }

    if (changed) {
      animatingRef.current = true;
      lastTimeRef.current = performance.now();
      if (!requestRef.current) {
        requestRef.current = requestAnimationFrame(updateFrame);
      }
    }
  }, [text]);

  const updateFrame = (time: number) => {
    // ⚡ Bolt Optimization: Stop requesting animation frames when the component is done animating.
    // This reduces CPU load from O(N) to O(1) idle state since we had 60fps loops per text block.
    if (!animatingRef.current) {
        requestRef.current = undefined;
        return;
    }

    const delta = time - lastTimeRef.current;
    // cap delta to prevent massive jumps when tab is hidden
    const safeDelta = Math.min(delta, 100);
    lastTimeRef.current = time;

    let stillAnimating = false;
    let newDisplay = '';

    for (let i = 0; i < charsRef.current.length; i++) {
        const charObj = charsRef.current[i];
        if (charObj.isSpace) {
            newDisplay += charObj.target;
            continue;
        }

        if (charObj.phase === 3) {
            newDisplay += charObj.target;
            continue;
        }

        charObj.age += safeDelta;
        
        // Phase 0: 0-300ms -> Sparse letters
        // Phase 1: 300-800ms -> Noise
        // Phase 2: 800-1400ms -> Probabilistic decode Decode

        if (charObj.age < 300) {
            charObj.phase = 0;
            stillAnimating = true;
            if (Math.random() < 0.05) {
                charObj.current = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
            } else if (Math.random() < 0.1 || charObj.current === ' ') {
                charObj.current = Math.random() < 0.05 ? ALPHABET[Math.floor(Math.random() * ALPHABET.length)] : ' ';
            }
        } else if (charObj.age < 800) {
            charObj.phase = 1;
            stillAnimating = true;
            if (Math.random() < 0.4) {
               charObj.current = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
            }
        } else if (charObj.age < 1400) {
            charObj.phase = 2;
            stillAnimating = true;
            const decodeProgress = (charObj.age - 800) / 600; 
            if (Math.random() < decodeProgress) {
                charObj.phase = 3;
                charObj.current = charObj.target;
            } else {
                if (Math.random() < 0.4) {
                    charObj.current = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
                }
            }
        } else {
            charObj.phase = 3;
            charObj.current = charObj.target;
        }
        
        newDisplay += charObj.current;
    }

    setDisplay(newDisplay);
    if (!stillAnimating) {
        animatingRef.current = false;
    }

    // ⚡ Bolt Optimization: Only schedule next frame if still animating.
    if (animatingRef.current) {
        requestRef.current = requestAnimationFrame(updateFrame);
    } else {
        requestRef.current = undefined;
    }
  };

  useEffect(() => {
    // ⚡ Bolt Optimization: Initial check to avoid scheduling if already done.
    if (animatingRef.current) {
      requestRef.current = requestAnimationFrame(updateFrame);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return <span style={{ color: animatingRef.current ? 'var(--accent)' : 'inherit', transition: 'color 0.4s ease-out', display: 'inline', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{display}</span>;
};

export const mapChildrenToAnimated = (children: React.ReactNode): React.ReactNode => {
  return React.Children.map(children, child => {
    if (typeof child === 'string') {
      return <AnimatedText text={child} />;
    }
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        // @ts-ignore
        children: mapChildrenToAnimated(child.props.children)
      });
    }
    return child;
  });
};

export const AnimatedParagraph = ({ children, ...props }: any) => {
  return <p {...props}>{mapChildrenToAnimated(children)}</p>;
};

export const AnimatedHeading = ({ level, children, ...props }: any) => {
  const Tag = `h${level}` as any;
  return <Tag {...props}>{mapChildrenToAnimated(children)}</Tag>;
};

export const AnimatedListItem = ({ children, ...props }: any) => {
  return <li {...props}>{mapChildrenToAnimated(children)}</li>;
};
