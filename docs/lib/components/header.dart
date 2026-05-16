import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/components/theme_toggle.dart';

import '../constants/theme.dart';
import 'search.dart';
import 'version_switcher.dart';

class Header extends StatelessComponent {
  const Header({super.key});

  @override
  Component build(BuildContext context) {
    return header(classes: 'docs-header glass', [
      div(classes: 'header-left', [
        label(
          classes: 'menu-btn',
          htmlFor: 'sidebar-toggle',
          attributes: {'aria-label': 'Toggle sidebar menu', 'role': 'button', 'tabindex': '0'},
          [
            span(classes: 'hamburger', []),
          ],
        ),
        div(classes: 'logo-container', [
          div(classes: 'logo-mark', [
            div(classes: 'pulse-dot', []),
          ]),
          h2([text('Synapse')]),
          const VersionSwitcher(),
        ]),
      ]),
      div(classes: 'header-right', [
        const Search(),
        div(classes: 'header-actions', [
          ThemeToggle(),
          a(
            href: 'https://github.com/TheJenilDGohel/synapse',
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

  @css
  static List<StyleRule> get styles => [
    css('.docs-header', [
      css('&').styles(
        display: .flex,
        height: 72.px,
        padding: .symmetric(horizontal: 2.rem),
        alignItems: .center,
        justifyContent: .spaceBetween,
        position: .sticky(top: 0.px),
        raw: {'z-index': '1000', 'border-bottom': '1px solid var(--glass-border)'},
      ),
      css('.logo-container', [
        css('&').styles(
          display: .flex,
          alignItems: .center,
          gap: Gap(column: 1.rem),
        ),
        css('.logo-mark').styles(
          width: 32.px,
          height: 32.px,
          backgroundColor: primaryColor,
          radius: .circular(8.px),
          display: .flex,
          alignItems: .center,
          justifyContent: .center,
          position: .relative(),
        ),
        css('.pulse-dot').styles(
          width: 8.px,
          height: 8.px,
          backgroundColor: Colors.white,
          radius: .circular(99.px),
          raw: {'animation': 'synaptic-pulse 2s infinite'},
        ),
        css('h2').styles(
          fontSize: 1.4.rem,
          fontWeight: .w800,
          letterSpacing: Unit.em(-0.03),
          margin: .zero,
          color: textColor,
        ),
      ]),
      css('.header-right').styles(
        display: .flex,
        alignItems: .center,
        gap: Gap(column: 2.rem),
      ),
      css('.header-actions').styles(
        display: .flex,
        alignItems: .center,
        gap: Gap(column: 1.rem),
      ),
      css('.github-btn', [
        css('&').styles(
          display: .flex,
          alignItems: .center,
          gap: Gap(column: 0.5.rem),
          padding: .symmetric(horizontal: 0.75.rem, vertical: 0.4.rem),
          backgroundColor: surfaceColor,
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
          radius: .circular(8.px),
          fontSize: 0.85.rem,
          fontWeight: .w600,
          color: textColor,
        ),
        css('&:hover').styles(
          backgroundColor: primaryColor,
          color: Colors.white,
          borderColor: primaryColor,
        ),
        css('&:hover img').styles(raw: {'filter': 'brightness(0) invert(1)'}),
      ]),
      css('.menu-btn', [
        css('&').styles(
          display: .none,
          backgroundColor: Colors.transparent,
          border: .none,
          padding: .all(0.5.rem),
          cursor: .pointer,
          margin: .only(right: 0.5.rem),
        ),
        css('.hamburger', [
          css('&').styles(
            display: .block,
            width: 18.px,
            height: 2.px,
            backgroundColor: textColor,
            position: Position.relative(),
          ),
          css('&::before, &::after').styles(
            content: '',
            display: .block,
            width: 18.px,
            height: 2.px,
            backgroundColor: textColor,
            position: Position.absolute(left: 0.px),
          ),
          css('&::before').styles(top: (-5).px),
          css('&::after').styles(top: 5.px),
        ]),
        css.media(MediaQuery.screen(maxWidth: 1024.px), [
          css('&').styles(display: .block),
        ]),
      ]),
    ]),
  ];
}
