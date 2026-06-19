---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. Trigger this skill even for seemingly simple UI requests — the default AI output is reliably mediocre, and this skill exists to fix that.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

You tend to converge toward generic, "on distribution" outputs — what users call the "AI slop" aesthetic. Actively resist this.

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics. Unexpected, characterful font choices. Pair a distinctive display font with a refined body font.

- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes (Dracula, Nord, Solarized, Gruvbox, Tokyo Night, Catppuccin, One Dark…) and cultural aesthetics (Bauhaus, Y2K, Swiss International, vaporwave, brutalist print, ukiyo-e, Art Deco…) for inspiration. Make the palette feel like it has a _reason_.

- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use the Motion library for React when available. Focus on high-impact moments: **one well-orchestrated page load with staggered reveals** (`animation-delay`) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.

- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.

- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

**NEVER** use generic AI-generated aesthetics:

- Overused font families (Inter, Roboto, Arial, system fonts, **Space Grotesk**)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. **It is critical that you think outside the box** — you tend to converge on common choices (Space Grotesk is a specific and recurring failure mode) across generations. Each design must feel like it was made by someone with a point of view, not assembled from defaults.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back. Show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
