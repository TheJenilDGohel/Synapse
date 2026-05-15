import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import '../constants/site.dart';
import '../constants/theme.dart';

class VersionSwitcher extends StatelessComponent {
  const VersionSwitcher({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'version-switcher', [
      div(classes: 'version-dropdown', [
        span(classes: 'active-version', [
          text(currentTrack == 'beta' ? betaVersion : stableVersion),
          span(classes: 'chevron', [text('▼')]),
        ]),
        ul(classes: 'dropdown-menu', [
          li([
            a(href: '#', classes: currentTrack == 'stable' ? 'active' : '', [
              div(classes: 'version-info', [
                span(classes: 'version-label', [text('Stable')]),
                span(classes: 'version-number', [text(stableVersion)]),
              ]),
            ]),
          ]),
          li([
            a(href: '#', classes: currentTrack == 'beta' ? 'active' : '', [
              div(classes: 'version-info', [
                span(classes: 'version-label', [text('Beta')]),
                span(classes: 'version-number', [text(betaVersion)]),
                span(classes: 'current-badge', [text('Active Beta')]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]);
  }

  @css
  static List<StyleRule> get styles => [
    css('.version-switcher', [
      css('&').styles(
        position: Position.relative(),
        display: .flex,
        alignItems: .center,
      ),
      css('.active-version', [
        css('&').styles(
          display: .flex,
          alignItems: .center,
          gap: Gap(column: 0.5.rem),
          padding: .symmetric(horizontal: 0.75.rem, vertical: 0.5.rem),
          backgroundColor: surfaceColor,
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
          radius: .circular(10.px),
          fontSize: 0.85.rem,
          fontWeight: .w600,
          cursor: .pointer,
          color: primaryColor,
          transition: Transition('all', duration: const Duration(milliseconds: 200)),
        ),
        css('&:hover').styles(
          backgroundColor: backgroundColor,
          border: Border.all(style: BorderStyle.solid, color: primaryColor, width: 1.px),
          shadow: BoxShadow(offsetX: 0.px, offsetY: 4.px, blur: 12.px, color: primaryColor.withOpacity(0.1)),
        ),
        css('.chevron').styles(fontSize: 0.6.rem, opacity: 0.7),
      ]),
      css('.dropdown-menu', [
        css('&').styles(
          display: .none,
          position: Position.absolute(top: 100.percent, left: 0.px),
          margin: .only(top: 0.75.rem),
          backgroundColor: backgroundColor,
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
          radius: .circular(12.px),
          padding: .symmetric(vertical: 0.5.rem),
          minWidth: 200.px,
          listStyle: ListStyle.none,
          shadow: BoxShadow(
            offsetX: 0.px,
            offsetY: 10.px,
            blur: 30.px,
            color: const Color('rgba(0, 0, 0, 0.2)'),
          ),
          zIndex: ZIndex(1000),
        ),
        css('.version-switcher:hover &').styles(display: .block),
      ]),
      css('li a', [
        css('&').styles(
          display: .block,
          padding: .symmetric(horizontal: 1.rem, vertical: 1.rem),
          textDecoration: TextDecoration.none,
          transition: Transition('background-color', duration: const Duration(milliseconds: 150)),
          radius: .circular(8.px),
          margin: .symmetric(horizontal: 0.5.rem, vertical: 0.25.rem),
        ),
        css('&:hover').styles(backgroundColor: surfaceColor),
        css('.version-info').styles(
          display: .flex,
          flexDirection: .column,
          gap: Gap(row: 2.px),
        ),
        css('.version-label').styles(
          fontSize: 0.7.rem,
          fontWeight: .w700,
          textTransform: TextTransform.upperCase,
          letterSpacing: 0.05.em,
          color: textMutedColor,
        ),
        css('.version-number').styles(
          fontSize: 0.95.rem,
          fontWeight: .w500,
          color: textColor,
        ),
        css('.current-badge').styles(
          fontSize: 0.65.rem,
          padding: .symmetric(horizontal: 0.4.rem, vertical: 0.15.rem),
          backgroundColor: primaryColor,
          color: Colors.white,
          radius: .circular(4.px),
          width: .fitContent,
          margin: .only(top: 0.5.rem),
        ),
        css('&.active .version-label').styles(color: primaryColor),
      ]),
    ]),
  ];
}
