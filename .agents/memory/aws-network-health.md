---
name: AWS network health boundaries
description: ECS placement zones must match ALB coverage; container, ALB, and CloudFront health are separate checks.
---

Keep ECS task-placement subnets within the Availability Zones enabled on its ALB.

**Why:** During AWS restoration, ECS could schedule into a zone absent from the ALB. Tasks served successful container health checks but were stopped for failed ELB checks. The user confirmed ECS stabilized after restricting placement to the ALB's enabled zones.

**How to apply:** When a running task fails ELB checks, compare ECS placement zones with ALB network mapping, not only ports and security groups.

Treat container health, ALB reachability, and CloudFront reachability as distinct boundaries.

**Why:** After ECS stabilized, a direct ALB health request succeeded while the identical CloudFront path returned 504. Successful container health checks alone had not established end-to-end availability.

**How to apply:** Compare the same read-only path through each boundary before changing application code. An origin's protocol and listener port are separate from the ECS container port.