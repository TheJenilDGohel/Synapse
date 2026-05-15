import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/jaspr_content.dart';

import '../components/header.dart';
import '../components/sidebar.dart';
import '../constants/site.dart';
import '../constants/theme.dart';

class DocsLayout extends PageLayout {
  DocsLayout();

  @override
  Pattern get name => RegExp(".*");

  @override
  Component buildLayout(Page page, Component child) {
    return DocsLayoutWrapper(child: child);
  }
}

class DocsLayoutWrapper extends StatelessComponent {
  final Component child;
  const DocsLayoutWrapper({required this.child});

  @override
  Component build(BuildContext context) {
    return div(classes: 'layout-root', [
      input(type: InputType.checkbox, id: 'sidebar-toggle', classes: 'sidebar-toggle-input'),
      Sidebar(),
      div(classes: 'layout-main', [
        const Header(),
        if (currentTrack == 'beta')
          div(classes: 'beta-banner', [
            span(classes: 'beta-tag', [text('BETA')]),
            text(' You are viewing the documentation for the upcoming '),
            strong([text(betaVersion)]),
            text(' release. Tool schemas and actions may change.'),
          ]),
        main_(classes: 'layout-content', [
          child,
        ]),
      ]),
      label(classes: 'sidebar-overlay', htmlFor: 'sidebar-toggle', []),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.beta-banner', [
      css('&').styles(
        backgroundColor: const Color('color-mix(in srgb, var(--primary-color) 8%, var(--background-color))'),
        borderBottom: BorderSide(style: BorderStyle.solid, color: borderColor, width: 1.px),
        padding: .symmetric(horizontal: 2.rem, vertical: 0.75.rem),
        fontSize: 0.875.rem,
        textAlign: TextAlign.center,
        color: textColor.withOpacity(0.9),
      ),
      css('.beta-tag').styles(
        backgroundColor: primaryColor,
        color: Colors.white,
        padding: .symmetric(horizontal: 0.4.rem, vertical: 0.15.rem),
        radius: .circular(4.px),
        fontSize: 0.7.rem,
        fontWeight: .w800,
        margin: .only(right: 0.5.rem),
      ),
    ]),
    css('.layout-root', [
      css('&').styles(
...
        width: 100.percent,
        minHeight: 100.vh,
      ),
      css('.layout-main', [
        css('&').styles(
          display: .flex,
          flexDirection: .column,
          flex: Flex(grow: 1),
          height: 100.vh,
          overflow: Overflow.auto,
        ),
      ]),
      css('.layout-content', [
        css('&').styles(
          padding: .symmetric(horizontal: 4.rem, vertical: 3.rem),
          maxWidth: 900.px,
          margin: .only(left: .auto, right: .auto),
          flex: Flex(grow: 1),
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('&').styles(
            padding: .symmetric(horizontal: 1.5.rem, vertical: 2.rem),
          ),
        ]),
      ]),
      css('.sidebar-toggle-input', [
        css('&').styles(display: .none),
      ]),
      css('.sidebar-overlay', [
        css('&').styles(
          position: Position.fixed(top: 0.px, left: 0.px, right: 0.px, bottom: 0.px),
          backgroundColor: const Color('rgba(0, 0, 0, 0.6)'),
          backdropFilter: Filter.blur(8.px),
          zIndex: ZIndex(90),
          display: .none,
          cursor: .pointer,
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('.sidebar-toggle-input:checked ~ &').styles(display: .block),
        ]),
      ]),
      css.media(MediaQuery.screen(maxWidth: 768.px), [
        css('.sidebar-toggle-input:checked ~ .sidebar').styles(
          raw: {'transform': 'translateX(0)'},
        ),
      ]),
    ]),
  ];
}
