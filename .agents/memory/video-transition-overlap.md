---
name: Video transition overlap
description: Preserve visual continuity across animated scene boundaries.
---

Keep a visible, high-contrast carrier through the outgoing scene's exit while the next scene establishes its first readable element. Scene timers may overlap on paper while child opacity keyframes make the actual rendered transition nearly empty.

**Why:** A full-loop frame scan exposed near-empty frames at scene changes even though the scripted handoff timings overlapped.

**How to apply:** After changing motion timing, sample the rendered film around each scene boundary. If a carrier fades before the next scene is visible, adjust its opacity timing or contrast without changing the fixed runtime; confirm the result from frames rather than timing values alone.