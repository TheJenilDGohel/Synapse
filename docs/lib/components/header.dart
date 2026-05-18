import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/components/theme_toggle.dart';

import '../constants/theme.dart';
import 'search.dart';
import 'version_switcher.dart';

class Header extends StatelessComponent {
  final VoidCallback? onMenuTap;

  const Header({this.onMenuTap, super.key});

  @override
  Component build(BuildContext context) {
    return header(classes: 'docs-header glass', [
      div(classes: 'header-left', [
        label(
          classes: 'menu-btn',
          htmlFor: 'sidebar-toggle',
          events: {
            'click': (e) {
              if (onMenuTap != null) onMenuTap!();
            }
          },
          attributes: {'aria-label': 'Toggle sidebar menu', 'role': 'button', 'tabindex': '0'},
          [
            span(classes: 'hamburger', []),
          ],
        ),
        div(classes: 'logo-container', [
          div(classes: 'logo-mark', [
            div(classes: 'pulse-dot', []),
          ]),
          h2([text('Loci')]),
          const VersionSwitcher(),
        ]),
      ]),
      div(classes: 'header-right', [
        const Search(),
        div(classes: 'header-actions', [
          ThemeToggle(),
          a(
            href: 'https://github.com/TheJenilDGohel/loci',
            target: Target.blank,
            classes: 'github-btn',
            [
              img(src: 'https://cdn.simpleicons.org/github/f8fafc', width: 20, height: 20, alt: 'GitHub'),
              span([text('Star')]),
            ],
          ),
        ]),
      ]),
    ]);
  }
}
