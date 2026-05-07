import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../constants/site.dart';

class About extends StatelessComponent {
  const About({super.key});

  @override
  Component build(BuildContext context) {
    return section([
      h1([text('Community & Support')]),
      p([text('Synapse is an open-source project built by and for the developer community. Here is how you can get involved and get help.')]),
      
      div(classes: 'support-grid', [
        _buildSupportCard(
          'GitHub Discussions',
          'Ask questions, share ideas, and connect with other Synapse users.',
          'https://github.com/TheJenilDGohel/synapse/discussions',
          '💬',
        ),
        _buildSupportCard(
          'Issue Tracker',
          'Report bugs or request new features on our GitHub repository.',
          'https://github.com/TheJenilDGohel/synapse/issues',
          '🐛',
        ),
        _buildSupportCard(
          'Contributing',
          'Help improve Synapse by contributing code, docs, tests, or issue reports.',
          '/contributing',
          '🤝',
        ),
      ]),
    ]);
  }

  Component _buildSupportCard(String title, String description, String url, String icon) {
    return div(classes: 'support-card', [
      span(classes: 'card-icon', [text(icon)]),
      h3([text(title)]),
      p([text(description)]),
      a(href: url.startsWith('http') ? url : publicPath(url), target: url.startsWith('http') ? Target.blank : Target.self, [text('Learn more →')]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.support-grid').styles(
      display: .grid,
      raw: {'grid-template-columns': '1fr 1fr'},
      gap: Gap(row: 2.rem, column: 2.rem),
      margin: .only(top: 3.rem),
    ),
    css('.support-card').styles(
      padding: .all(1.5.rem),
      backgroundColor: const Color('#0f172a'), // surfaceColor
      border: Border.all(style: BorderStyle.solid, color: const Color('#1e293b'), width: 1.px), // borderColor
      radius: .circular(16.px),
    ),
    css('.card-icon').styles(
      fontSize: 2.rem,
      display: .block,
      margin: .only(bottom: 1.rem),
    ),
    css('.support-card h3').styles(
      fontSize: 1.125.rem,
      margin: .only(bottom: 0.5.rem),
    ),
    css('.support-card p').styles(
      fontSize: 0.95.rem,
      color: const Color('#94a3b8'), // textMutedColor
      margin: .only(bottom: 1.5.rem),
      lineHeight: Unit.expression('1.5'),
    ),
  ];

}
