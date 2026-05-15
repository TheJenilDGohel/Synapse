import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../constants/site.dart';
import '../components/header.dart';
import '../components/card.dart';
import '../components/docs_link.dart';

class Home extends StatelessComponent {
  const Home({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'landing-page', [
      const Header(),
      div(classes: 'mesh-bg', []),
      main_([
        section(classes: 'hero', [
          div(classes: 'hero-badge-row', [
            span(classes: 'badge-neural', [
              div(classes: 'pulse-ring', []),
              text('SYNAPTIC V2 CORE'),
            ]),
            span(classes: 'badge-version', [text(stableVersion)]),
          ]),
          h1([
            text('The Unified Context Layer for '),
            span(classes: 'text-gradient', [text('AI Agents')]),
          ]),
          p(classes: 'hero-lead', [
            text(
              'Synapse bridges the gap between biological intent and synthetic reasoning. A local-first context engine powered by temporal knowledge and persistent memory.',
            ),
          ]),
          div(classes: 'hero-btns', [
            DocsLink(to: '/intro', classes: 'btn-elite btn-primary', child: text('Get Started')),
            a(
              href: 'https://github.com/TheJenilDGohel/synapse',
              classes: 'btn-elite btn-secondary',
              [text('GitHub')],
            ),
          ]),
        ]),

        section(classes: 'features-bento', [
          const Card(
            title: 'Neural Memory',
            description:
                'Context that survives. Persist decisions and lessons in a semantic vault that follows your agent into every session.',
            icon: '🧠',
          ),
          const Card(
            title: 'Temporal KG',
            description:
                'Relationships over time. Traverse architectural evolution and query the rationale behind past code changes.',
            icon: '🕸️',
          ),
          const Card(
            title: 'Hybrid Discovery',
            description:
                'Fuse keyword speed with vector depth. RRF retrieval ensures your AI always finds the relevant needle in the haystack.',
            icon: '⚡',
          ),
          const Card(
            title: 'AST Intelligence',
            description:
                'Precision mapping. AST-aware resolution allows agents to jump directly to definitions and callers with 100% accuracy.',
            icon: '🤖',
          ),
        ]),
      ]),
    ]);
  }
}
