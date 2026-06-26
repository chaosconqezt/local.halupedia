## 2025-06-26 - Infinite requestAnimationFrame loops scale O(N) with text blocks
**Learning:** In React components that animate text character by character (like `AnimatedText`), keeping `requestAnimationFrame` running even when the animation finishes causes severe CPU load, especially since every paragraph, header, and list item on an encyclopedia page becomes its own instance running a loop 60 times a second.
**Action:** Always stop `requestAnimationFrame` when the animation completes (`animatingRef.current === false`) and only restart it when new props arrive that require animation.
