## 2024-03-20 - Runaway Animation Loop
**Learning:** `requestAnimationFrame` can cause infinite loops if the exit condition simply returns without stopping the rescheduling.
**Action:** Always ensure that when terminating a recursive `requestAnimationFrame` loop, you do not schedule another frame, and properly clear any references holding the request ID.
