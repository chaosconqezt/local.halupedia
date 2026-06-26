import React, { useState, useEffect, useRef } from 'react';

const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя1234567890!@#$%^&*";

export const AnimatedText = ({ text }: { text: string }) => {
  const [display, setDisplay] = useState(text);
  const charsRef = useRef<{ target: string; current: string; phase: number; age: number; isSpace: boolean }[]>([]);
  const requestRef = useRef<number>(0);
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
    }
  }, [text]);

  const updateFrame = (time: number) => {
    if (!animatingRef.current) {
        requestRef.current = requestAnimationFrame(updateFrame);
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

    requestRef.current = requestAnimationFrame(updateFrame);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(requestRef.current!);
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
