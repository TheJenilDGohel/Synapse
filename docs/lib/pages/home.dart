import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../constants/theme.dart';
import '../components/header.dart';
import '../components/docs_link.dart';

class Home extends StatelessComponent {
  const Home({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'landing-page', [
      const Header(),
      main_([
        // HERO SECTION
        section(classes: 'hero', [
          div(classes: 'hero-glow', []),
          h1([
            text('The Unified Context Layer for '),
            span(classes: 'gradient-text', [text('AI Agents')]),
          ]),
          p(classes: 'hero-subtitle', [
            text(
              'A production-ready MCP server combining persistent AI memory, temporal knowledge graph, and semantic code intelligence. Zero cloud. Local-first. Pure SQLite.',
            ),
          ]),
          div(classes: 'hero-actions', [
            DocsLink(to: '/intro', classes: 'btn btn-primary', child: text('Get Started')),
            a(href: 'https://github.com/TheJenilDGohel/synapse', classes: 'btn btn-outline', [text('View on GitHub')]),
          ]),
          // Terminal/Code Snippet Mockup
          div(classes: 'hero-terminal-wrapper', [
            div(classes: 'hero-terminal', [
              div(classes: 'terminal-header', [
                div(classes: 'terminal-dot red', []),
                div(classes: 'terminal-dot yellow', []),
                div(classes: 'terminal-dot green', []),
                span(classes: 'terminal-title', [text('bash')]),
              ]),
              div(classes: 'terminal-body', [
                div(classes: 'terminal-line', [
                  span(classes: 'prompt', [text('\$')]),
                  span(classes: 'command', [text(' npm install -g synapse-cortex')]),
                ]),
                div(classes: 'terminal-line', [
                  span(classes: 'output', [text('added 120 packages, and audited 121 packages in 2s')]),
                ]),
                div(classes: 'terminal-line', [
                  span(classes: 'prompt', [text('\$')]),
                  span(classes: 'command', [text(' synapse setup')]),
                ]),
                div(classes: 'terminal-line', [
                  span(classes: 'output success', [text('✔')]),
                  span(classes: 'output', [text(' Workspace initialized')]),
                ]),
                div(classes: 'terminal-line', [
                  span(classes: 'output success', [text('✔')]),
                  span(classes: 'output', [text(' SQLite Vector extension loaded')]),
                ]),
                div(classes: 'terminal-line', [
                  span(classes: 'output success', [text('✔')]),
                  span(classes: 'output', [text(' Synapse is ready. 74 tools available.')]),
                ]),
              ])
            ])
          ])
        ]),

        // FEATURE SHOWCASE: ALTERNATING LAYOUT
        section(classes: 'showcase-section', [
          div(classes: 'showcase-container', [
            // Feature 1
            div(classes: 'showcase-row', [
              div(classes: 'showcase-text', [
                h2(classes: 'showcase-title', [text('Persistent AI Memory')]),
                p(classes: 'showcase-description', [
                  text('Standard AI agents lose context between sessions. They don\'t know the "why" behind a refactor, or the lessons learned from past attempts.'),
                  br(),
                  br(),
                  text('Synapse persists project facts, decisions, and instructions in a local SQLite store with automatic semantic deduplication. Your AI remembers what you taught it, forever.'),
                ]),
                ul(classes: 'showcase-list', [
                  li([text('Cross-session semantic recall')]),
                  li([text('Agent-scoped isolation (Nests)')]),
                  li([text('Teacher-mode instructions')]),
                ])
              ]),
              div(classes: 'showcase-visual', [
                div(classes: 'visual-box memory-box', [
                  div(classes: 'icon-large', [text('🧠')]),
                  h3([text('Memory Store')]),
                  p([text('Vector-indexed SQLite')]),
                ])
              ]),
            ]),

            // Feature 2 (Reversed)
            div(classes: 'showcase-row reverse', [
              div(classes: 'showcase-text', [
                h2(classes: 'showcase-title', [text('Code Intelligence')]),
                p(classes: 'showcase-description', [
                  text('Don\'t settle for simple string matching. Empower your AI to actually understand your code structure.'),
                  br(),
                  br(),
                  text('Synapse provides hybrid BM25 + vector search, AST-aware chunking via tree-sitter, and precise symbol tracking (definitions, usages, and callers) right out of the box.'),
                ]),
                ul(classes: 'showcase-list', [
                  li([text('Hybrid lexical & semantic search')]),
                  li([text('AST-aware parsing')]),
                  li([text('Symbol definition & usage tracking')]),
                ])
              ]),
              div(classes: 'showcase-visual', [
                div(classes: 'visual-box intel-box', [
                  div(classes: 'icon-large', [text('🤖')]),
                  h3([text('AST Parser')]),
                  p([text('O(N) Fast Indexing')]),
                ])
              ]),
            ]),

            // Feature 3
            div(classes: 'showcase-row', [
              div(classes: 'showcase-text', [
                h2(classes: 'showcase-title', [text('Temporal Knowledge Graph')]),
                p(classes: 'showcase-description', [
                  text('Code changes, but architectural intent often gets lost. Track how your system evolves over time.'),
                  br(),
                  br(),
                  text('The temporal entity-triple store allows multi-hop traversal and time-travel queries (as_of) so your AI can understand why a decision was made six months ago.'),
                ]),
                ul(classes: 'showcase-list', [
                  li([text('Entity-triple relationships')]),
                  li([text('Multi-hop traversal')]),
                  li([text('Time-travel queries')]),
                ])
              ]),
              div(classes: 'showcase-visual', [
                div(classes: 'visual-box graph-box', [
                  div(classes: 'icon-large', [text('🕸️')]),
                  h3([text('Temporal Graph')]),
                  p([text('Versioned Triples')]),
                ])
              ]),
            ]),
          ]),
        ]),

        // CTA SECTION
        section(classes: 'cta-section', [
          h2(classes: 'cta-title', [text('Zero Cloud. Pure Local.')]),
          p(classes: 'cta-subtitle', [
            text('Everything runs on your machine. Your codebase, memories, and knowledge graph are stored in a local SQLite database using the sqlite-vec extension. Complete privacy, offline-ready, and lightning fast.')
          ]),
          div(classes: 'cta-actions', [
            DocsLink(to: '/quickstart', classes: 'btn btn-primary btn-large', child: text('View Quick Start Guide')),
          ])
        ])
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
          padding: .only(top: 8.rem, bottom: 4.rem, left: 2.rem, right: 2.rem),
          textAlign: .center,
          maxWidth: 1200.px,
          margin: .symmetric(horizontal: .auto),
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('&').styles(
            padding: .only(top: 4.rem, bottom: 2.rem, left: 1.5.rem, right: 1.5.rem),
          ),
        ]),
      ]),
      css('.hero-glow').styles(
        position: Position.absolute(top: 30.percent, left: 50.percent),
        width: 800.px,
        height: 600.px,
        raw: {
          'background':
              'radial-gradient(circle, color-mix(in srgb, var(--primary-color) 15%, transparent) 0%, transparent 60%)',
          'transform': 'translate(-50%, -50%)',
          'filter': 'blur(80px)',
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
          'background': 'linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
      ),
      css('.hero-subtitle', [
        css('&').styles(
          fontSize: 1.25.rem,
          color: textMutedColor,
          maxWidth: 700.px,
          margin: .symmetric(horizontal: .auto, vertical: 2.5.rem),
          lineHeight: Unit.expression('1.6'),
          raw: {'animation': 'fadeUp 0.8s ease-out 0.1s both'},
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('&').styles(
            fontSize: 1.125.rem,
            margin: .symmetric(vertical: 1.5.rem),
          ),
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
        cursor: .pointer,
      ),
      css('.btn-large').styles(
        padding: .symmetric(horizontal: 2.5.rem, vertical: 1.rem),
        fontSize: 1.1.rem,
      ),
      css('.btn-primary').styles(
        backgroundColor: primaryColor,
        color: backgroundColor,
        border: Border.all(style: BorderStyle.solid, color: Colors.transparent, width: 2.px),
      ),
      css('.btn-primary:hover').styles(
        raw: {
          'transform': 'translateY(-2px)',
        },
        shadow: BoxShadow(
          offsetX: 0.px,
          offsetY: 10.px,
          blur: 20.px,
          color: const Color('color-mix(in srgb, var(--primary-color) 40%, transparent)'),
        ),
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

      // Terminal Styles
      css('.hero-terminal-wrapper').styles(
        margin: .only(top: 4.rem),
        display: .flex,
        justifyContent: .center,
        raw: {'animation': 'fadeUp 1s ease-out 0.4s both'},
      ),
      css('.hero-terminal').styles(
        width: 100.percent,
        maxWidth: 700.px,
        backgroundColor: const Color('#0d1117'),
        border: Border.all(style: BorderStyle.solid, color: const Color('#30363d'), width: 1.px),
        radius: .circular(12.px),
        overflow: Overflow.hidden,
        textAlign: .left,
        shadow: BoxShadow(
          offsetX: 0.px,
          offsetY: 20.px,
          blur: 40.px,
          color: const Color('rgba(0,0,0,0.5)'),
        ),
      ),
      css('.terminal-header').styles(
        display: .flex,
        alignItems: .center,
        padding: .symmetric(horizontal: 1.rem, vertical: 0.75.rem),
        backgroundColor: const Color('#161b22'),
        border: Border.only(bottom: BorderSide(style: BorderStyle.solid, color: const Color('#30363d'), width: 1.px)),
      ),
      css('.terminal-dot').styles(
        width: 12.px,
        height: 12.px,
        radius: .circular(50.percent),
        margin: .only(right: 8.px),
      ),
      css('.terminal-dot.red').styles(backgroundColor: const Color('#ff5f56')),
      css('.terminal-dot.yellow').styles(backgroundColor: const Color('#ffbd2e')),
      css('.terminal-dot.green').styles(backgroundColor: const Color('#27c93f')),
      css('.terminal-title').styles(
        margin: .only(left: .auto, right: .auto),
        color: const Color('#8b949e'),
        fontSize: 0.8.rem,
        fontFamily: const .list([FontFamily('Fira Code'), FontFamily('monospace')]),
        raw: {'transform': 'translateX(-20px)'}, // offset for dots
      ),
      css('.terminal-body').styles(
        padding: .all(1.5.rem),
        fontFamily: const .list([FontFamily('Fira Code'), FontFamily('monospace')]),
        fontSize: 0.9.rem,
        lineHeight: Unit.expression('1.6'),
      ),
      css('.terminal-line').styles(
        display: .flex,
        margin: .only(bottom: 0.5.rem),
      ),
      css('.prompt').styles(
        color: primaryColor,
        margin: .only(right: 1.rem),
        userSelect: .none,
      ),
      css('.command').styles(
        color: const Color('#c9d1d9'),
      ),
      css('.output').styles(
        color: const Color('#8b949e'),
      ),
      css('.output.success').styles(
        color: const Color('#3fb950'),
        margin: .only(right: 0.5.rem),
      ),

      // Showcase Section
      css('.showcase-section').styles(
        padding: .symmetric(vertical: 6.rem, horizontal: 2.rem),
        backgroundColor: surfaceColor,
        border: Border.only(
          top: BorderSide(style: BorderStyle.solid, color: borderColor, width: 1.px),
          bottom: BorderSide(style: BorderStyle.solid, color: borderColor, width: 1.px),
        )
      ),
      css('.showcase-container').styles(
        maxWidth: 1200.px,
        margin: .symmetric(horizontal: .auto),
        display: .flex,
        flexDirection: .column,
        gap: Gap(row: 6.rem),
      ),
      css('.showcase-row', [
        css('&').styles(
          display: .flex,
          alignItems: .center,
          gap: Gap(column: 4.rem),
        ),
        css.media(MediaQuery.screen(maxWidth: 900.px), [
          css('&').styles(
            flexDirection: .column,
            textAlign: .center,
            gap: Gap(row: 3.rem),
          ),
          css('.showcase-list').styles(
            display: .flex,
            flexDirection: .column,
            alignItems: .center,
          )
        ]),
      ]),
      css('.showcase-row.reverse', [
        css('&').styles(
          flexDirection: .rowReverse,
        ),
        css.media(MediaQuery.screen(maxWidth: 900.px), [
          css('&').styles(
            flexDirection: .column,
          ),
        ]),
      ]),
      css('.showcase-text').styles(
        raw: {'flex': '1 1 auto'},
      ),
      css('.showcase-title').styles(
        fontSize: 2.5.rem,
        fontWeight: .w800,
        margin: .only(bottom: 1.5.rem),
        color: textColor,
        lineHeight: Unit.expression('1.2'),
      ),
      css('.showcase-description').styles(
        fontSize: 1.125.rem,
        color: textMutedColor,
        lineHeight: Unit.expression('1.7'),
        margin: .only(bottom: 2.rem),
      ),
      css('.showcase-list').styles(
        listStyle: ListStyle.none,
        padding: .zero,
        margin: .zero,
      ),
      css('.showcase-list li').styles(
        position: Position.relative(),
        padding: .only(left: 2.rem, bottom: 1.rem),
        color: textColor,
        fontSize: 1.1.rem,
        fontWeight: .w500,
      ),
      css('.showcase-list li::before').styles(
        content: '"✓"',
        position: Position.absolute(left: 0.px, top: 0.px),
        color: primaryColor,
        fontWeight: .w800,
      ),
      css('.showcase-visual').styles(
        raw: {'flex': '1 1 auto'},
        display: .flex,
        justifyContent: .center,
        alignItems: .center,
      ),
      css('.visual-box').styles(
        width: 300.px,
        height: 300.px,
        backgroundColor: backgroundColor,
        border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
        radius: .circular(24.px),
        display: .flex,
        flexDirection: .column,
        justifyContent: .center,
        alignItems: .center,
        textAlign: .center,
        padding: .all(2.rem),
        position: Position.relative(),
        overflow: Overflow.hidden,
      ),
      css('.visual-box::before').styles(
        content: '""',
        position: Position.absolute(top: 0.px, left: 0.px, right: 0.px, bottom: 0.px),
        raw: {
          'background': 'radial-gradient(circle at center, color-mix(in srgb, var(--primary-color) 10%, transparent) 0%, transparent 70%)',
        },
        zIndex: ZIndex(0),
      ),
      css('.icon-large').styles(
        fontSize: 5.rem,
        margin: .only(bottom: 1.rem),
        position: Position.relative(),
        zIndex: ZIndex(1),
      ),
      css('.visual-box h3').styles(
        fontSize: 1.5.rem,
        color: textColor,
        margin: .only(bottom: 0.5.rem),
        position: Position.relative(),
        zIndex: ZIndex(1),
      ),
      css('.visual-box p').styles(
        color: primaryColor,
        fontWeight: .w600,
        position: Position.relative(),
        zIndex: ZIndex(1),
      ),

      // CTA Section
      css('.cta-section').styles(
        padding: .symmetric(vertical: 8.rem, horizontal: 2.rem),
        textAlign: .center,
        maxWidth: 800.px,
        margin: .symmetric(horizontal: .auto),
      ),
      css('.cta-title').styles(
        fontSize: 3.rem,
        fontWeight: .w800,
        color: textColor,
        margin: .only(bottom: 1.5.rem),
      ),
      css('.cta-subtitle').styles(
        fontSize: 1.25.rem,
        color: textMutedColor,
        lineHeight: Unit.expression('1.7'),
        margin: .only(bottom: 3.rem),
      ),
      css('.cta-actions').styles(
        display: .flex,
        justifyContent: .center,
      ),

      css('@keyframes fadeUp', [
        css('from').styles(raw: {'opacity': '0', 'transform': 'translateY(20px)'}),
        css('to').styles(raw: {'opacity': '1', 'transform': 'translateY(0)'}),
      ]),
    ]),
  ];
}
