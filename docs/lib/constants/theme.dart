import 'package:jaspr/dom.dart';

// Color palette with theme support.
// We use CSS variables that are updated by the ThemeToggle component.

const primaryColor = Color('var(--primary-color, #0284c7)');
const secondaryColor = Color('var(--secondary-color, #38bdf8)');
const backgroundColor = Color('var(--background-color, #ffffff)');
const surfaceColor = Color('var(--surface-color, #f8fafc)');
const borderColor = Color('var(--border-color, #e2e8f0)');
const textColor = Color('var(--text-color, #0f172a)');
const textMutedColor = Color('var(--text-muted-color, #64748b)');

@css
List<StyleRule> get styles => [
  css(':root', [
    css('&').styles(
      raw: {
        '--primary-color': '#0ea5e9', // Serverpod-like clean blue
        '--secondary-color': '#38bdf8',
        '--background-color': '#ffffff', // Clean white
        '--surface-color': '#f8fafc',
        '--border-color': '#e2e8f0',
        '--text-color': '#0f172a',
        '--text-muted-color': '#64748b',
      },
    ),
  ]),

  css('[data-theme=\"dark\"]', [
    css('&').styles(
      raw: {
        '--primary-color': '#38bdf8',
        '--secondary-color': '#7dd3fc',
        '--background-color': '#0f172a', // Deep slate for premium dark mode
        '--surface-color': '#1e293b',
        '--border-color': '#334155',
        '--text-color': '#f8fafc',
        '--text-muted-color': '#94a3b8',
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
    lineHeight: Unit.expression('1.7'),
  ),

  css('h1, h2, h3, h4').styles(
    color: textColor,
    fontWeight: .w700,
    margin: .only(top: 2.5.rem, bottom: 1.rem),
  ),
  
  css('h1').styles(fontSize: 2.5.rem, letterSpacing: (-0.02).em),
  css('h2').styles(fontSize: 1.75.rem, border: Border.only(bottom: BorderSide(style: BorderStyle.solid, color: borderColor, width: 1.px)), padding: .only(bottom: 0.5.rem)),

  css('a').styles(
    color: primaryColor,
    textDecoration: TextDecoration.none,
    transition: Transition('color', duration: const Duration(milliseconds: 200)),
  ),
  css('a:hover').styles(color: secondaryColor),

  css('p, ul, ol').styles(
    margin: .only(bottom: 1.25.rem),
    color: const Color('color-mix(in srgb, var(--text-color) 85%, transparent)'),
  ),

  css('li').styles(margin: .only(bottom: 0.5.rem)),

  css('pre').styles(
    backgroundColor: const Color('#0f172a'), // Always dark slate for code
    padding: .all(1.25.rem),
    radius: .circular(8.px),
    overflow: Overflow.auto,
    border: Border.all(style: BorderStyle.solid, color: const Color('#1e293b'), width: 1.px),
    margin: .symmetric(vertical: 1.5.rem),
  ),

  css('code').styles(
    fontFamily: const .list([FontFamily('ui-monospace'), FontFamily('SFMono-Regular'), FontFamily('Menlo'), FontFamily('Monaco'), FontFamily('Consolas'), FontFamily('monospace')]),
    fontSize: 0.9.em,
  ),

  css('p code, li code').styles(
    backgroundColor: surfaceColor,
    border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
    padding: .symmetric(horizontal: 0.4.rem, vertical: 0.2.rem),
    radius: .circular(6.px),
    color: primaryColor,
  ),
  
  css('table').styles(
    width: 100.percent,
    raw: {'border-collapse': 'collapse'},
    margin: .symmetric(vertical: 1.5.rem),
  ),
  
  css('th, td').styles(
    padding: .all(0.75.rem),
    border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
    textAlign: TextAlign.left,
  ),
  
  css('th').styles(
    backgroundColor: surfaceColor,
    fontWeight: .w600,
  ),
];
