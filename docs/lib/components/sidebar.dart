import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import 'docs_link.dart';

class Sidebar extends StatelessComponent {
  const Sidebar({super.key});

  @override
  Component build(BuildContext context) {
    var activePath = context.url;

    return aside(classes: 'sidebar glass', [
      div(classes: 'sidebar-content', [
        _buildNavGroup(context, 'Core Guides', [
          (label: 'Introduction', path: '/intro'),
          (label: 'Quick Start', path: '/tutorials/quickstart'),
          (label: 'Installation', path: '/how-to/install'),
          (label: 'Configuration', path: '/how-to/configuration'),
          (label: 'Managing Memory', path: '/how-to/memory'),
          (label: 'Knowledge Graph', path: '/how-to/kg'),
        ], activePath, 0),
        _buildNavGroup(context, 'Concepts', [
          (label: 'Core Concepts', path: '/explanation/concepts'),
          (label: 'Architecture', path: '/explanation/architecture'),
          (label: 'Code Intelligence', path: '/explanation/code-intelligence'),
          (label: 'Persistent Memory', path: '/explanation/memory'),
          (label: 'Knowledge Graph', path: '/explanation/knowledge-graph'),
        ], activePath, 1),
        _buildNavGroup(context, 'Reference', [
          (label: 'Power Controllers', path: '/reference/tools'),
          (label: 'CLI Commands', path: '/reference/cli'),
          (label: 'Config Options', path: '/reference/config'),
        ], activePath, 2),
        _buildNavGroup(context, 'Community', [
          (label: 'Community Hub', path: '/community'),
          (label: 'Contributing', path: '/contributing'),
          (label: 'FAQ', path: '/faq'),
        ], activePath, 3),
      ]),
    ]);
  }

  Component _buildNavGroup(
    BuildContext context,
    String title,
    List<({String label, String path})> items,
    String activePath,
    int index,
  ) {
    return div(
      classes: 'nav-group',
      styles: Styles.raw({'animation': 'enter-stagger 0.4s ease-out ${index * 0.1}s both'}),
      [
        h3([Component.text(title)]),
        ul([
          for (var item in items)
            li([
              label(htmlFor: 'sidebar-toggle', [
                DocsLink(
                  to: item.path,
                  classes: 'nav-link ${activePath == item.path ? 'active' : ''}',
                  child: Component.text(item.label),
                ),
              ]),
            ]),
        ]),
      ],
    );
  }
}
