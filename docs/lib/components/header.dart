import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/components/theme_toggle.dart';

import '../constants/theme.dart';
import 'search.dart';

class Header extends StatelessComponent {
  final VoidCallback? onMenuTap;

  const Header({this.onMenuTap, super.key});

  @override
  Component build(BuildContext context) {
    return header(classes: 'docs-header', [
      div(classes: 'header-left', [
        label(classes: 'menu-btn', htmlFor: 'sidebar-toggle', [
          span(classes: 'hamburger', []),
        ]),
        h2([text('Synapse')]),
        span(classes: 'version-badge', [text('v0.1.0-beta')]),
      ]),
      div(classes: 'header-right', [
        const Search(),
        ThemeToggle(),
        a(href: 'https://github.com/TheJenilDGohel/synapse', target: Target.blank, classes: 'github-link', [
          img(src: 'https://cdn.simpleicons.org/github/f8fafc', width: 24, height: 24, alt: 'GitHub'),
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
        backgroundColor: const Color('color-mix(in srgb, var(--background-color) 70%, transparent)'),
        backdropFilter: Filter.blur(12.px),
        border: Border.only(bottom: BorderSide(style: BorderStyle.solid, color: borderColor, width: 1.px)),
        position: .sticky(top: 0.px),
        raw: {'z-index': '100'},
      ),
      css('.header-left', [
        css('&').styles(display: .flex, alignItems: .center, gap: Gap(column: 1.rem)),
        css('h2').styles(
          fontSize: 1.25.rem,
          fontWeight: .w700,
          letterSpacing: Unit.em(-0.02),
        ),
        css('.version-badge').styles(
          fontSize: 0.75.rem,
          padding: .symmetric(horizontal: 0.5.rem, vertical: 0.25.rem),
          backgroundColor: const Color('color-mix(in srgb, var(--primary-color) 12%, transparent)'),
          color: primaryColor,
          radius: .circular(99.px),
          fontWeight: .w500,
        ),
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
              width: 20.px,
              height: 2.px,
              backgroundColor: textColor,
              position: Position.relative(),
            ),
            css('&::before, &::after').styles(
              content: '',
              display: .block,
              width: 20.px,
              height: 2.px,
              backgroundColor: textColor,
              position: Position.absolute(left: 0.px),
            ),
            css('&::before').styles(position: Position.absolute(top: (-6).px, left: 0.px)),
            css('&::after').styles(position: Position.absolute(top: 6.px, left: 0.px)),
          ]),
          css.media(MediaQuery.screen(maxWidth: 768.px), [
            css('&').styles(display: .block),
          ]),
        ]),
      ]),
      css('.header-right', [
        css('&').styles(display: .flex, alignItems: .center, gap: Gap(column: 1.5.rem)),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('.search-trigger').styles(display: .none),
        ]),
      ]),
      css('.search-trigger', [
        css('&').styles(
          display: .flex,
          alignItems: .center,
          gap: Gap(column: 0.75.rem),
          padding: .symmetric(horizontal: 0.75.rem, vertical: 0.5.rem),
          backgroundColor: surfaceColor,
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
          radius: .circular(8.px),
          cursor: .pointer,
          minWidth: 240.px,
          color: textMutedColor,
        ),
        css('span').styles(fontSize: 0.875.rem),
        css('kbd').styles(
          margin: .only(left: .auto),
          fontSize: 0.75.rem,
          padding: .symmetric(horizontal: 0.4.rem, vertical: 0.1.rem),
          backgroundColor: backgroundColor,
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
          radius: .circular(4.px),
        ),
      ]),
      css('.github-link').styles(
        display: .flex,
        opacity: 0.7,
        transition: Transition('opacity', duration: const Duration(milliseconds: 200)),
      ),
      css('.github-link:hover').styles(opacity: 1),
    ]),
  ];

}
