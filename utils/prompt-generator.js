/**
 * MH-Quantum Prompt Generator
 * Turns raw DOM data into structured AI prompts.
 */
(function () {
  'use strict';

  function fence(lang, content) {
    return `\`\`\`${lang || ''}\n${content || ''}\n\`\`\``;
  }

  window.MHPromptGenerator = {
    TEMPLATES: {
      DEBUG: 'debug',
      FIX_CSS: 'fix_css',
      REFACTOR: 'refactor',
      A11Y: 'accessibility',
      EXPLAIN: 'explain',
      ANIMATE: 'animate',
      CUSTOM: 'custom'
    },

    generate(payloadOrElement, intent = '', template = 'debug') {
      if (!payloadOrElement) return '';
      const payload = payloadOrElement.element ? payloadOrElement.element : payloadOrElement;
      const generators = {
        debug: () => this.debugPrompt(payload, intent),
        fix_css: () => this.fixCSSPrompt(payload, intent),
        refactor: () => this.refactorPrompt(payload, intent),
        recreate: () => this.recreatePrompt(payload, intent),
        accessibility: () => this.a11yPrompt(payload, intent),
        explain: () => this.explainPrompt(payload, intent),
        animate: () => this.animatePrompt(payload, intent),
        custom: () => this.customPrompt(payload, intent)
      };
      return (generators[template] || generators.debug)();
    },

    buildContextBlock(payload) {
      if (!payload) return 'No context available.';
      const identity = payload.identity || {};
      const geometry = payload.geometry || { viewport: {} };
      const stacking = payload.stacking || {};
      const styles = payload.styles || {};
      const content = payload.content || {};
      const inlineStyles = payload.inlineStyles || '';
      const appliedRules = payload.appliedRules || [];
      const animation = payload.animation || {};
      const parentContext = payload.parentContext || null;
      const meta = payload.meta || { viewport: {} };

      const cssLines = [
        `color: ${styles.color || 'inherit'};`,
        `background-color: ${styles.backgroundColor || 'transparent'};`,
        `font-size: ${styles.fontSize || 'inherit'};`,
        `font-family: ${styles.fontFamily || 'inherit'};`,
        `font-weight: ${styles.fontWeight || 'inherit'};`,
        `line-height: ${styles.lineHeight || 'inherit'};`,
        `padding: ${styles.padding || '0'};`,
        `margin: ${styles.margin || '0'};`,
        `border: ${styles.border || 'none'};`,
        `border-radius: ${styles.borderRadius || '0'};`,
        styles.boxShadow && styles.boxShadow !== 'none' ? `box-shadow: ${styles.boxShadow};` : '',
        styles.transform ? `transform: ${styles.transform};` : '',
        styles.transition ? `transition: ${styles.transition};` : '',
        styles.animation ? `animation: ${styles.animation};` : '',
        styles.opacity && styles.opacity !== '1' ? `opacity: ${styles.opacity};` : ''
      ].filter(Boolean).join('\n');

      const blocks = [
`## Element Context (MH-Quantum Inspector)

### Identity
- **Tag:** \`${identity.tag}\`
- **Selector:** \`${identity.selector}\`
- **XPath:** \`${identity.xpath}\`
- **ID:** ${identity.id ? `\`#${identity.id}\`` : 'none'}
- **Classes:** ${identity.classes?.length ? identity.classes.map((c) => `\`.${c}\``).join(', ') : 'none'}
- **Role:** ${identity.role || 'none'} | **ARIA Label:** ${identity.ariaLabel || 'none'}

### Geometry
- **Document position:** x=${geometry.x}px, y=${geometry.y}px
- **Size:** ${geometry.width}px × ${geometry.height}px
- **Viewport:** left=${geometry.viewport.x}px, top=${geometry.viewport.y}px

### Stacking
- **z-index:** ${stacking.zIndex} | **position:** ${stacking.position}
- **display:** ${stacking.display} | **overflow:** ${stacking.overflow} | **Stacking depth:** ${stacking.depth}

### Critical Computed Styles
${fence('css', cssLines)}`
      ];

      if (styles.flexbox?.display) {
        blocks.push(`### Flexbox\n${fence('css', `display: ${styles.flexbox.display};\nflex-direction: ${styles.flexbox.flexDirection};\njustify-content: ${styles.flexbox.justifyContent};\nalign-items: ${styles.flexbox.alignItems};\ngap: ${styles.flexbox.gap};`)}`);
      }

      if (styles.grid?.display) {
        blocks.push(`### Grid\n${fence('css', `display: ${styles.grid.display};\ngrid-template-columns: ${styles.grid.gridTemplateColumns};\ngrid-template-rows: ${styles.grid.gridTemplateRows};\ngrid-area: ${styles.grid.gridArea};`)}`);
      }

      if (inlineStyles) blocks.push(`### Inline Styles\n${fence('css', inlineStyles)}`);

      if (parentContext) {
        blocks.push(`### Parent Context\n- **Parent:** \`${parentContext.tag}${parentContext.id ? `#${parentContext.id}` : ''}\`\n- **Classes:** ${parentContext.classes?.length ? parentContext.classes.map((c) => `\`.${c}\``).join(', ') : 'none'}\n- **Parent display:** ${parentContext.display} | **position:** ${parentContext.position}`);
      }

      if (appliedRules.length) {
        blocks.push(`### Applied CSS Rules (${appliedRules.length} rules)\n${appliedRules.slice(0, 5).map((r) => `- \`${r.selector}\` → ${String(r.styles).slice(0, 120)}${String(r.styles).length > 120 ? '…' : ''}`).join('\n')}`);
      }

      if (animation.hasAnimation || animation.isAnimating || animation.hasTransition) {
        blocks.push(`### Animation State\n- **Has animation:** ${!!animation.hasAnimation}\n- **Has transition:** ${!!animation.hasTransition}\n- **Currently animating:** ${!!animation.isAnimating}\n- **Active keyframes:** ${animation.keyframes?.length ? animation.keyframes.map((k) => `${k.name} (${k.playState})`).join(', ') : 'none'}`);
      }

      if (content.textContent) blocks.push(`### Content\n${fence('', content.textContent.slice(0, 150))}`);

      blocks.push(`### Meta\n- **URL:** ${meta.url}\n- **Viewport:** ${meta.viewport.width}×${meta.viewport.height} | **DPR:** ${meta.pixelRatio}\n- **Captured:** ${meta.timestamp}`);

      return blocks.join('\n\n').trim();
    },

    debugPrompt(payload, intent) {
      return `You are a senior frontend developer. I'm debugging an HTML element.

${this.buildContextBlock(payload)}

## Issue
${intent || 'I need help debugging this element. Please analyze it and identify potential issues.'}

## Request
1. Identify CSS conflicts or specificity issues.
2. Flag layout/stacking bugs.
3. Check common pitfalls with \`${payload.stacking.display}\` layout.
4. Suggest specific fixes with code examples.
5. Note accessibility concerns.`;
    },

    fixCSSPrompt(payload, intent) {
      return `You are a CSS expert. Fix the following element's styling issue.

${this.buildContextBlock(payload)}

## What I'm trying to achieve
${intent || 'Please analyze the element and suggest CSS improvements.'}

## Request
Provide the exact CSS fix. Show:
1. The problematic CSS, if any.
2. The corrected CSS.
3. Why this fix works.
4. Any side effects to watch for.`;
    },

    refactorPrompt(payload, intent) {
      return `You are a senior frontend engineer. Refactor this element.

${this.buildContextBlock(payload)}

## Refactor Goal
${intent || 'Improve the code quality, performance, and maintainability of this element.'}

## Request
1. Suggest a cleaner HTML structure.
2. Optimize CSS and specificity.
3. Flag performance concerns.
4. Provide before/after code.`;
    },

    recreatePrompt(payload, intent) {
      return `You are a senior frontend engineer. Recreate this element faithfully.

${this.buildContextBlock(payload)}

## Recreate Goal
${intent || 'Recreate this element with equivalent structure and visual output.'}

## Request
1. Provide semantic HTML for this element.
2. Provide complete CSS needed to match layout and visuals.
3. Preserve spacing, typography, and stacking behavior.
4. Mention assumptions when source details are missing.`;
    },

    a11yPrompt(payload, intent) {
      return `You are an accessibility expert (WCAG 2.1 AA). Audit this element.

${this.buildContextBlock(payload)}

## Accessibility Audit Request
${intent || 'Perform a full accessibility audit on this element.'}

## Audit Checklist
1. ARIA roles and labels.
2. Color contrast.
3. Keyboard navigation.
4. Screen reader compatibility.
5. Focus management.
6. Semantic HTML correctness.
7. Touch target size (min 44×44px).

Provide specific fixes for each issue found.`;
    },

    explainPrompt(payload, intent) {
      return `Explain what this HTML element is doing in plain terms.

${this.buildContextBlock(payload)}

## What I want to understand
${intent || "Explain this element — its purpose, how it's styled, and how it fits into the layout."}

Explain:
1. What this element does visually.
2. Why it's positioned/sized this way.
3. How the parent context affects it.
4. Any interesting CSS techniques being used.`;
    },

    animatePrompt(payload, intent) {
      return `You are an animation expert (CSS + Web Animations API).

${this.buildContextBlock(payload)}

## Animation Request
${intent || 'Add a smooth, performant animation to this element.'}

Requirements:
- Use CSS animations or Web Animations API.
- Prefer \`transform\` and \`opacity\`.
- Respect \`prefers-reduced-motion\`.
- Provide complete, copy-paste ready code.`;
    },

    customPrompt(payload, intent) {
      return `${this.buildContextBlock(payload)}

## My Request
${intent || 'Please help me with this element.'}`;
    },

    generateMCPPayload(payload, intent, template) {
      return {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'mh_quantum_inspect',
          arguments: {
            element_data: payload,
            user_intent: intent,
            template,
            prompt: this.generate(payload, intent, template)
          }
        }
      };
    }
  };
})();
