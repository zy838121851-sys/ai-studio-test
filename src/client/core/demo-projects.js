export function makeDemoProjectThumb(title, index, escapeHtml = (value) => String(value)) {
  const palettes = [
    ["#f8fbff", "#dde8ff", "#4d9cff"],
    ["#fff7ed", "#fed7aa", "#f97316"],
    ["#f8fafc", "#c7d2fe", "#111827"],
    ["#fdf2f8", "#fbcfe8", "#db2777"],
    ["#ecfeff", "#bae6fd", "#0284c7"],
    ["#f7fee7", "#d9f99d", "#65a30d"],
    ["#faf5ff", "#e9d5ff", "#7c3aed"],
    ["#fff1f2", "#fecdd3", "#e11d48"],
    ["#f0fdf4", "#bbf7d0", "#16a34a"],
    ["#f9fafb", "#d1d5db", "#374151"]
  ];
  const [a, b, c] = palettes[index % palettes.length];
  const safeTitle = escapeHtml(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${a}"/>
          <stop offset="1" stop-color="${b}"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" rx="28" fill="url(#g)"/>
      <rect x="54" y="52" width="852" height="72" rx="20" fill="rgba(255,255,255,.74)"/>
      <rect x="86" y="164" width="372" height="260" rx="28" fill="rgba(255,255,255,.78)"/>
      <rect x="500" y="164" width="320" height="52" rx="18" fill="${c}" opacity=".9"/>
      <rect x="500" y="242" width="250" height="24" rx="12" fill="#17202c" opacity=".2"/>
      <rect x="500" y="292" width="300" height="24" rx="12" fill="#17202c" opacity=".14"/>
      <circle cx="272" cy="294" r="86" fill="${c}" opacity=".18"/>
      <text x="82" y="97" fill="#17202c" font-family="Arial, sans-serif" font-size="28" font-weight="800">${safeTitle}</text>
      <text x="500" y="396" fill="#17202c" font-family="Arial, sans-serif" font-size="22" opacity=".58">AI Studio Board ${index + 1}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function buildDemoProjects({ projects = [], escapeHtml, hasSeeded, markSeeded }) {
  const titles = [
    "Toy 3D Render",
    "Fashion Lookbook",
    "Smart Device Scene",
    "Perfume Poster",
    "Coffee Product Page",
    "Sneaker Campaign",
    "Headphone Lighting",
    "Beauty Detail Page",
    "Furniture Interior",
    "Food Packaging"
  ];
  const existingDemoIds = new Set(projects.filter((project) => project.isDemo).map((project) => project.id));
  const missingTitles = titles
    .map((title, index) => ({ title, index }))
    .filter((item) => !existingDemoIds.has(`demo-project-${item.index + 1}`));

  if (!missingTitles.length && hasSeeded?.()) return projects;

  const now = Date.now();
  const demos = missingTitles.map(({ title, index }) => ({
    id: `demo-project-${index + 1}`,
    title,
    prompt: `${title} demo board`,
    thumbnail: makeDemoProjectThumb(title, index, escapeHtml),
    createdAt: now - (index + 1) * 86400000,
    updatedAt: now - index * 4860000,
    itemCount: 1,
    isDemo: true
  }));

  markSeeded?.();
  return [...demos, ...projects];
}
