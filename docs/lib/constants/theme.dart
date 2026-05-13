import 'package:jaspr/dom.dart';

// Color palette with theme support.
// We use CSS variables that are updated by the ThemeToggle component.

const primaryColor = Color('var(--primary-color, #38bdf8)');
const secondaryColor = Color('var(--secondary-color, #818cf8)');
const backgroundColor = Color('var(--background-color, #020617)');
const surfaceColor = Color('var(--surface-color, #0f172a)');
const borderColor = Color('var(--border-color, #1e293b)');
const textColor = Color('var(--text-color, #f8fafc)');
const textMutedColor = Color('var(--text-muted-color, #94a3b8)');

@css
List<StyleRule> get styles => [
  css(':root', [
    css('&').styles(
      raw: {
        '--primary-color': '#2dd4bf', // Teal, matching the GitHub badges
        '--secondary-color': '#0f766e',
        '--background-color': '#000000', // Deep black for enterprise feel
        '--surface-color': '#0a0a0a',
        '--border-color': '#262626',
        '--text-color': '#ffffff',
        '--text-muted-color': '#a3a3a3',
      },
    ),
  ]),

  css('[data-theme=\"light\"]', [
    css('&').styles(
      raw: {
        '--primary-color': '#0f766e',
        '--secondary-color': '#2dd4bf',
        '--background-color': '#ffffff',
        '--surface-color': '#f5f5f5',
        '--border-color': '#e5e5e5',
        '--text-color': '#171717',
        '--text-muted-color': '#525252',
      },
    ),
  ]),

  css('html, body').styles(
    margin: .zero,
    padding: .zero,
    fontFamily: const .list([FontFamily('Inter'), FontFamily('-apple-system'), FontFamily('BlinkMacSystemFont'), FontFamily('Segoe UI'), FontFamily('Roboto'), FontFamily('sans-serif')]),
    backgroundColor: backgroundColor,
    color: textColor,
    fontSize: 16.px,
    lineHeight: Unit.expression('1.5'),
  ),

  css('h1, h2, h3, h4').styles(
    color: textColor,
    fontWeight: .w700,
    margin: .only(top: 2.rem, bottom: 1.rem),
  ),

  css('a').styles(
    color: primaryColor,
    textDecoration: TextDecoration.none,
  ),

  css('p').styles(
    margin: .only(bottom: 1.25.rem),
    color: const Color('color-mix(in srgb, var(--text-color) 90%, transparent)'),
  ),

  css('pre').styles(
    backgroundColor: const Color('#1e293b'), // Always dark for code
    padding: .all(1.25.rem),
    radius: .circular(12.px),
    overflow: Overflow.auto,
    border: Border.all(style: BorderStyle.solid, color: const Color('#334155'), width: 1.px),
    margin: .symmetric(vertical: 1.5.rem),
  ),

  css('code').styles(
    fontFamily: const .list([FontFamily('Fira Code'), FontFamily('monospace')]),
    fontSize: 0.9.em,
  ),

  css('p code').styles(
    backgroundColor: surfaceColor,
    padding: .symmetric(horizontal: 0.4.rem, vertical: 0.1.rem),
    radius: .circular(4.px),
    color: primaryColor,
  ),
];
