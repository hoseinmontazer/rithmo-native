/**
 * applyGlobalFont — give every `Text` and `TextInput` the Persian family (F-07).
 *
 * ── Why this, rather than editing 141 files ─────────────────────────────────
 *
 * The app already routes 92% of its font sizes through `theme/typography.ts`
 * (458 token references against 38 literals), so the *scale* was never the
 * problem — the missing piece was a family, plus a weight that Android can
 * actually draw. Rewriting ~700 style blocks to add two properties each would
 * be a very large diff whose only purpose is to repeat the same two properties,
 * and every one of those edits is a chance to change a size by accident and
 * damage a hierarchy that F-01…F-06 verified on hardware.
 *
 * Patching the component once applies the family everywhere, changes no size,
 * weight, colour or spacing, and leaves the existing hierarchy exactly as it
 * was verified.
 *
 * ── The rule that makes it safe ─────────────────────────────────────────────
 *
 * **A style that already names a fontFamily is never touched.** This is not a
 * nicety; it is what stops the patch from destroying the icon set. Every
 * `react-native-vector-icons` glyph is a `<Text>` whose style sets
 * `fontFamily: 'MaterialCommunityIcons'` and whose content is a private-use
 * codepoint. Overwriting that family would replace all 82 icon usages with
 * missing-glyph boxes — the exact failure F-03 fixed for `pill-off` and F-06
 * guarded with a glyphmap test, reintroduced app-wide.
 *
 * The weight is read from the caller's own style so `fontWeight: '600'`
 * resolves to the SemiBold *file* instead of collapsing to bold — see
 * `fonts.ts` for why Android needs that.
 *
 * Call once, before the first render.
 */
import { Text, TextInput, StyleSheet } from 'react-native';
import type { TextStyle } from 'react-native';
import { fontFamilyForWeight } from '@theme/fonts';

type Patchable = {
  render?: (...args: unknown[]) => unknown;
  __rithmoFontPatched?: boolean;
};

/**
 * Resolve the family a node should use, or null to leave it alone.
 * Exported for testing: this predicate is the whole contract.
 */
export function resolveFontFamily(style: unknown): string | null {
  const flat = StyleSheet.flatten(style as TextStyle) as TextStyle | undefined;
  // Already spoken for — icon fonts, or a deliberate per-site choice.
  if (flat?.fontFamily) {
    return null;
  }
  return fontFamilyForWeight(flat?.fontWeight);
}

function patch(Component: unknown): void {
  const target = Component as Patchable;
  if (!target || typeof target.render !== 'function' || target.__rithmoFontPatched) {
    return;
  }
  const original = target.render;

  target.render = function patchedRender(...args: unknown[]) {
    const element = original.apply(this, args) as {
      props?: { style?: unknown };
    } | null;
    if (!element || !element.props) {
      return element;
    }
    const family = resolveFontFamily(element.props.style);
    if (family === null) {
      return element;
    }
    // Prepend, so anything the caller set still wins on every other property.
    const React = require('react');
    return React.cloneElement(element, {
      style: [{ fontFamily: family }, element.props.style],
    });
  };
  target.__rithmoFontPatched = true;
}

let applied = false;

export function applyGlobalFont(): void {
  if (applied) {
    return;
  }
  patch(Text);
  patch(TextInput);
  applied = true;
}
