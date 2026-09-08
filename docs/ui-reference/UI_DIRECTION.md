# LittleReads UI Direction

## Purpose

This document is the permanent visual and implementation direction for
LittleReads.

Every AI/code assistant must read this file before making UI changes.

The reference images in:

docs/ui-reference/

are visual-quality references, NOT instructions to redesign LittleReads into
a different brand.

---

# BRAND MUST NOT CHANGE

Preserve the existing LittleReads identity.

Brand characteristics:

- warm
- imaginative
- friendly
- children's reading focused
- trustworthy for parents
- modern
- polished
- playful without looking childish

Primary visual identity:

- LittleReads purple
- existing cream/off-white background direction
- current orange/yellow supporting accents
- dark navy/near-black text
- soft supporting pastel surfaces

Do NOT introduce a new brand palette.

Do NOT replace the LittleReads logo.

Do NOT create a radically different design language.

---

# OBJECTIVE

The existing LittleReads UI works but currently feels too plain and flat.

The goal is to improve:

- visual hierarchy
- spacing
- content grouping
- surface depth
- card presentation
- typography hierarchy
- navigation
- empty states
- responsive layout
- usability
- accessibility
- polish

WITHOUT changing the underlying LittleReads visual direction.

---

# REFERENCE IMAGES

Homepage:

docs/ui-reference/homepage-reference.png

Customer dashboard:

docs/ui-reference/customer-dashboard-reference.png

Admin dashboard:

docs/ui-reference/admin-dashboard-reference.png

Use these for:

- information hierarchy
- section rhythm
- card density
- visual depth
- whitespace
- component proportions
- navigation quality
- polish

Do NOT copy:

- fake statistics
- fake products
- invented testimonials
- invented customer counts
- invented categories
- invented reviews
- invented payment claims

Real LittleReads data must always be used.

---

# VISUAL RULES

## Containers

Use consistent centered page containers.

Desktop:
comfortable maximum width.

Mobile:
16–20px horizontal gutters.

Do not let unrelated sections use arbitrary widths.

---

## Cards

Cards should generally use:

- subtle borders
- restrained radius
- soft shadow only where useful
- enough internal padding
- clear information hierarchy

Avoid:

- excessive shadows
- glassmorphism everywhere
- oversized rounding
- gradients on every component

---

## Purple

Purple is the primary interaction/brand color.

Use it for:

- primary CTAs
- active navigation
- important highlights
- selected states
- icons where appropriate

Do not flood every section with purple.

---

## Supporting surfaces

Use subtle:

- cream
- warm white
- very light lavender
- very light orange/yellow

to create separation between sections.

---

## Typography

Maintain a strong hierarchy.

H1:
large, bold, concise.

H2:
clear section heading.

H3:
card/content grouping.

Body:
comfortable readable size.

Metadata:
smaller and quieter.

Avoid having every piece of text at similar visual weight.

---

## Product covers

Book covers are important visual assets.

They must:

- retain aspect ratio
- never stretch
- never crop important artwork
- remain visually prominent
- use consistent containers

---

# PUBLIC EXPERIENCE

Public pages should feel like a polished children's ebook store.

Homepage should prioritize:

1. Value proposition
2. Browse Books CTA
3. Categories
4. Age discovery
5. Featured books
6. Benefits
7. Newsletter
8. Footer

Avoid excessive content.

---

# CUSTOMER EXPERIENCE

Customer account should feel personal and useful.

Dashboard should provide real information such as:

- books in library
- orders
- wishlist
- reviews

Library is a primary experience.

Purchased books should be visually prominent and easy to access.

---

# ADMIN EXPERIENCE

Admin must feel professional rather than playful.

Preserve LittleReads branding but reduce decorative elements.

Admin should emphasize:

- clarity
- information density
- readable tables
- clear status badges
- navigation
- search
- actions

Admin sidebar remains fixed on desktop.

Order statuses remain read-only.

---

# RESPONSIVENESS

All changed pages must be reviewed at:

320px
375px
430px
768px
1024px
1440px

No horizontal overflow.

Do not simply shrink desktop layouts.

Create intentional mobile layouts.

---

# ACCESSIBILITY

Maintain:

- proper labels
- semantic HTML
- keyboard navigation
- focus-visible states
- adequate contrast
- accessible icon buttons
- meaningful alt text

---

# PROHIBITED UI CHANGES

Do NOT:

- rebrand LittleReads
- change logo
- invent another color palette
- introduce unrelated illustrations
- add fake statistics
- remove existing working features
- change business logic just to improve layout
- change database schema
- change RLS
- change authentication
- modify payment integration
- modify API contracts unnecessarily

UI work should stay UI-focused.