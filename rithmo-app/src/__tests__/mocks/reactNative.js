// Minimal react-native stub for logic-level tests.
//
// Deliberately not a full mock: these suites test pure logic, and a large
// fake of the platform would mostly test itself. Each entry is here because
// a specific unit needs it.
//
//  - Platform:   branching in date/locale helpers.
//  - StyleSheet: `theme/applyGlobalFont` flattens an incoming style to decide
//                whether a node already names a fontFamily. That predicate is
//                what protects every vector icon from being overwritten, so it
//                is tested directly and needs a real `flatten`.
//  - I18nManager: RTL-dependent icon mirroring.
//  - Text / TextInput: `applyGlobalFont` patches their `render`; the stub just
//                has to be patchable.
const flatten = (style) => {
  if (!style) { return undefined; }
  if (Array.isArray(style)) {
    return style.reduce((acc, entry) => {
      const sub = flatten(entry);
      return sub ? { ...acc, ...sub } : acc;
    }, {});
  }
  return style;
};

module.exports = {
  Platform: { OS: 'android' },
  StyleSheet: { flatten, create: (s) => s, hairlineWidth: 1 },
  I18nManager: { isRTL: true, forceRTL: () => {}, allowRTL: () => {} },
  Text: { render: () => null },
  TextInput: { render: () => null },
};
