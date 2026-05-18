import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../constants/site.dart';

class About extends StatelessComponent {
  const About({super.key});

  @override
  Component build(BuildContext context) {
    return section([
      h1([text('Community & Support')]),
      p([
        text(
          'Loci is an open-source project built by and for the developer community. Here is how you can get involved and get help.',
        ),
      ]),

      div(classes: 'support-grid', [
        _buildSupportCard(
          'GitHub Discussions',
          'Ask questions, share ideas, and connect with other Loci users.',
          'https://github.com/TheJenilDGohel/loci/discussions',
          '💬',
        ),
        _buildSupportCard(
          'Issue Tracker',
          'Report bugs or request new features on our GitHub repository.',
          'https://github.com/TheJenilDGohel/loci/issues',
          '🐛',
        ),
        _buildSupportCard(
          'Contributing',
          'Help improve Loci by contributing code, docs, tests, or issue reports.',
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
      a(
        href: url.startsWith('http') ? url : publicPath(url),
        target: url.startsWith('http') ? Target.blank : Target.self,
        [text('Learn more →')],
      ),
    ]);
  }
}
