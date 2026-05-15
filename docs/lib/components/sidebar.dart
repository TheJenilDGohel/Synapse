import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import '../constants/theme.dart';
import 'docs_link.dart';

class Sidebar extends StatelessComponent {
  const Sidebar({super.key});

  @override
  Component build(BuildContext context) {
    var activePath = context.url;

    return aside(classes: 'sidebar', [
      div(classes: 'sidebar-content', [
        _buildNavGroup(context, 'Core Guides', [
          (label: 'Introduction', path: '/intro'),
          (label: 'Quick Start', path: '/tutorials/quickstart'),
          (label: 'Installation', path: '/how-to/install'),
          (label: 'Configuration', path: '/how-to/configuration'),
          (label: 'Managing Memory', path: '/how-to/memory'),
          (label: 'Knowledge Graph', path: '/how-to/kg'),
        ], activePath),
        _buildNavGroup(context, 'Concepts', [
          (label: 'Core Concepts', path: '/explanation/concepts'),
          (label: 'Architecture', path: '/explanation/architecture'),
          (label: 'Code Intelligence', path: '/explanation/code-intelligence'),
          (label: 'Persistent Memory', path: '/explanation/memory'),
          (label: 'Knowledge Graph', path: '/explanation/knowledge-graph'),
        ], activePath),
        _buildNavGroup(context, 'Reference', [
          (label: 'Power Controllers', path: '/reference/tools'),
          (label: 'CLI Commands', path: '/reference/cli'),
          (label: 'Config Options', path: '/reference/config'),
        ], activePath),
        _buildNavGroup(context, 'Community', [
          (label: 'Community Hub', path: '/community'),
          (label: 'Contributing', path: '/contributing'),
          (label: 'FAQ', path: '/faq'),
        ], activePath),
      ]),
    ]);
  }

  Component _buildNavGroup(
    BuildContext context,
    String title,
    List<({String label, String path})> items,
    String activePath,
  ) {
    return div(classes: 'nav-group', [
      h3([Component.text(title)]),
      ul([
        for (var item in items)
          li([
            label(htmlFor: 'sidebar-toggle', [
              DocsLink(
                to: item.path,
                classes: activePath == item.path ? 'active' : '',
                child: Component.text(item.label),
              ),
            ]),
          ]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.sidebar', [
      css('&').styles(
        width: 280.px,
        height: 100.vh,
        backgroundColor: surfaceColor,
        border: Border.only(
          right: BorderSide(style: BorderStyle.solid, color: borderColor, width: 1.px),
        ),
        padding: .all(2.rem),
        overflow: Overflow.auto,
        position: .sticky(top: 0.px),
        transition: Transition('transform', duration: const Duration(milliseconds: 300)),
        raw: {'z-index': '100'},
      ),
      css.media(MediaQuery.screen(maxWidth: 768.px), [
        css('&').styles(
          position: Position.fixed(left: 0.px, top: 0.px),
          raw: {'transform': 'translateX(-100%)'},
        ),
      ]),
      css('.nav-group', [
        css('&').styles(margin: .only(bottom: 2.rem)),
        css('h3').styles(
          fontSize: 0.875.rem,
          fontWeight: .w600,
          color: textMutedColor,
          raw: {'text-transform': 'uppercase'},
          letterSpacing: 0.05.em,
          margin: .only(bottom: 1.rem),
        ),
        css('ul').styles(
          padding: .zero,
          margin: .zero,
          listStyle: ListStyle.none,
        ),
        css('li').styles(margin: .only(bottom: 0.5.rem)),
        css('a').styles(
          display: .block,
          fontSize: 0.95.rem,
          color: textMutedColor,
          padding: .symmetric(vertical: 0.25.rem),
          transition: Transition('color', duration: const Duration(milliseconds: 200)),
        ),
        css('a:hover').styles(color: textColor),
        css('a.active').styles(
          color: primaryColor,
          fontWeight: .w600,
        ),
      ]),
    ]),
  ];
}
