const TOOL_ICONS = {
  rect: '<svg viewBox="0 0 220 140" preserveAspectRatio="none"><rect x="4" y="4" width="212" height="132" rx="18" /></svg>',
  diamond: '<svg viewBox="0 0 180 180" preserveAspectRatio="none"><path d="M90 4l86 86-86 86-86-86 86-86z" /></svg>',
  circle: '<svg viewBox="0 0 180 180" preserveAspectRatio="none"><circle cx="90" cy="90" r="86" /></svg>',
  triangle: '<svg viewBox="0 0 180 180" preserveAspectRatio="none"><path d="M90 4l86 172H4L90 4z" /></svg>',
  star: '<svg viewBox="0 0 180 180" preserveAspectRatio="none"><path d="M90 4l25 53 58 8-42 41 10 58-51-28-51 28 10-58L7 65l58-8L90 4z" /></svg>',
  arrow: '<svg viewBox="0 0 240 120" preserveAspectRatio="none"><path d="M4 60h202" /><path d="M164 18l54 42-54 42" /></svg>',
  line: '<svg viewBox="0 0 240 80" preserveAspectRatio="none"><path d="M4 40h232" /></svg>',
  pen: '<svg viewBox="0 0 240 120" preserveAspectRatio="none"><path d="M52 88l94-70 36 34-96 68H48l4-32z" /><path d="M142 22l15-14c6-6 16-6 22 0l20 19c6 6 6 16 0 22l-14 14" /><path d="M52 88l34 32" /></svg>',
  text: '<svg viewBox="0 0 180 120"><path d="M38 24h104" /><path d="M90 24v72" /><path d="M66 96h48" /></svg>',
  "text-rect": '<svg viewBox="0 0 220 140" preserveAspectRatio="none"><rect x="4" y="4" width="212" height="132" rx="18" /></svg>',
  "text-circle": '<svg viewBox="0 0 180 180" preserveAspectRatio="none"><circle cx="90" cy="90" r="86" /></svg>',
  speech: '<svg viewBox="0 0 220 150" preserveAspectRatio="none"><path d="M4 4h212v106H84l-58 36v-36H4V4z" /></svg>',
  "left-arrow": '<svg viewBox="0 0 240 140" preserveAspectRatio="none"><path d="M72 8L4 70l68 62V94h164V46H72V8z" /></svg>',
  "right-arrow": '<svg viewBox="0 0 240 140" preserveAspectRatio="none"><path d="M168 8l68 62-68 62V94H4V46h164V8z" /></svg>',
  component: '<svg viewBox="0 0 220 140"><rect x="28" y="30" width="64" height="48" rx="10" /><rect x="128" y="30" width="64" height="48" rx="10" /><rect x="78" y="92" width="64" height="34" rx="9" /><path d="M92 54h36M110 78v14" /></svg>'
};

export function renderToolSvg(tool) {
  return TOOL_ICONS[tool] || TOOL_ICONS.rect;
}

export function getToolIconNames() {
  return Object.keys(TOOL_ICONS);
}
