import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../constants/theme.dart';
import '../components/header.dart';
import '../components/card.dart';
import '../components/docs_link.dart';

class Home extends StatelessComponent {
  const Home({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'landing-page', [
      const Header(),
      main_([
        section(classes: 'hero', [
          div(classes: 'hero-glow', []),
          h1([
            text('Local Context for '),
            span(classes: 'gradient-text', [text('MCP Clients')])
          ]),
          p(classes: 'hero-subtitle', [
            text('Synapse combines semantic code search, persistent memory, and a temporal knowledge graph in one local MCP server.')
          ]),
          div(classes: 'hero-actions', [
            DocsLink(to: '/intro', classes: 'btn btn-primary', child: text('Get Started')),
            a(href: 'https://github.com/TheJenilDGohel/synapse', classes: 'btn btn-outline', [text('View on GitHub')]),
          ]),
        ]),
        
        section(classes: 'features-grid', [
          const Card(
            title: 'Persistent Memory',
            description: 'Persist project facts, decisions, and lessons in a local SQLite store that survives across sessions.',
            icon: '🧠',
            onTap: null, // Just a card for now
          ),
          const Card(
            title: 'Code Intelligence',
            description: 'Search code with hybrid lexical and semantic retrieval, AST-aware chunking, and symbol lookup.',
            icon: '🤖',
          ),
          const Card(
            title: 'Knowledge Graph',
            description: 'Track entities and relationships over time so clients can query how architecture changes.',
            icon: '🎨',
          ),
        ]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.landing-page', [
      css('&').styles(
        minHeight: 100.vh,
        backgroundColor: backgroundColor,
        overflow: Overflow.hidden,
      ),
      css('.hero', [
        css('&').styles(
          position: Position.relative(),
          padding: .symmetric(vertical: 8.rem, horizontal: 2.rem),
          textAlign: .center,
          maxWidth: 1000.px,
          margin: .symmetric(horizontal: .auto),
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('&').styles(padding: .symmetric(vertical: 4.rem, horizontal: 1.5.rem)),
        ]),
      ]),
      css('.hero-glow').styles(
        position: Position.absolute(top: 50.percent, left: 50.percent),
        width: 600.px,
        height: 400.px,
        raw: {
          'background': 'radial-gradient(circle, color-mix(in srgb, var(--primary-color) 15%, transparent) 0%, transparent 70%)',
          'transform': 'translate(-50%, -50%)',
          'filter': 'blur(60px)',
          'z-index': '-1',
          'pointer-events': 'none',
        },
      ),
      css('h1', [
        css('&').styles(
          fontSize: 4.5.rem,
          fontWeight: .w800,
          letterSpacing: Unit.em(-0.04),
          lineHeight: Unit.expression('1.1'),
          margin: .only(bottom: 1.5.rem),
          raw: {'animation': 'fadeUp 0.8s ease-out'},
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('&').styles(fontSize: 2.5.rem),
        ]),
      ]),
      css('.gradient-text').styles(
        raw: {
          'background': 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
      ),
      css('.hero-subtitle', [
        css('&').styles(
          fontSize: 1.25.rem,
          color: textMutedColor,
          maxWidth: 600.px,
          margin: .symmetric(horizontal: .auto, vertical: 2.5.rem),
          lineHeight: Unit.expression('1.6'),
          raw: {'animation': 'fadeUp 0.8s ease-out 0.1s both'},
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('&').styles(fontSize: 1.125.rem, margin: .symmetric(vertical: 1.5.rem)),
        ]),
      ]),
      css('.hero-actions', [
        css('&').styles(
          display: .flex,
          justifyContent: .center,
          gap: Gap(column: 1.rem, row: 1.rem),
          raw: {'animation': 'fadeUp 0.8s ease-out 0.2s both'},
        ),
        css.media(MediaQuery.screen(maxWidth: 480.px), [
          css('&').styles(flexDirection: .column),
        ]),
      ]),
      css('.btn').styles(
        padding: .symmetric(horizontal: 2.rem, vertical: 0.875.rem),
        radius: .circular(12.px),
        fontSize: 1.rem,
        fontWeight: .w600,
        transition: Transition('all', duration: const Duration(milliseconds: 200)),
        textAlign: .center,
      ),
      css('.btn-primary').styles(
        backgroundColor: primaryColor,
        color: backgroundColor,
      ),
      css('.btn-primary:hover').styles(
        raw: {
          'transform': 'translateY(-2px)',
        },
        shadow: BoxShadow(offsetX: 0.px, offsetY: 10.px, blur: 20.px, color: const Color('color-mix(in srgb, var(--primary-color) 40%, transparent)')),
      ),
      css('.btn-outline').styles(
        backgroundColor: Colors.transparent,
        border: Border.all(style: BorderStyle.solid, color: borderColor, width: 2.px),
        color: textColor,
      ),
      css('.btn-outline:hover').styles(
        border: Border.all(style: BorderStyle.solid, color: textColor, width: 2.px),
        backgroundColor: const Color('color-mix(in srgb, var(--text-color) 4%, transparent)'),
        raw: {'transform': 'translateY(-2px)'},
      ),
      css('.features-grid', [
        css('&').styles(
          display: .grid,
          raw: {
            'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
            'animation': 'fadeUp 1s ease-out 0.4s both',
          },
          gap: Gap(row: 2.rem, column: 2.rem),
          padding: .symmetric(horizontal: 4.rem, vertical: 4.rem),
          maxWidth: 1200.px,
          margin: .symmetric(horizontal: Unit.auto),
        ),
        css.media(MediaQuery.screen(maxWidth: 1024.px), [
          css('&').styles(
          display: .grid,
          raw: {'grid-template-columns': '1fr'},
          padding: .symmetric(horizontal: 2.rem),
          ),
        ]),
      ]),
      
      css('@keyframes fadeUp', [
        css('from').styles(raw: {'opacity': '0', 'transform': 'translateY(20px)'}),
        css('to').styles(raw: {'opacity': '1', 'transform': 'translateY(0)'}),
      ]),
    ]),
  ];
}
