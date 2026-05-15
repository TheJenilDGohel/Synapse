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
                span(classes: 'current-badge', [text('Current')]),
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
        display: .inlineBlock,
      ),
      css('.active-version', [
        css('&').styles(
          display: .flex,
          alignItems: .center,
          gap: Gap(column: 0.5.rem),
          padding: .symmetric(horizontal: 0.75.rem, vertical: 0.4.rem),
          backgroundColor: surfaceColor,
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
          radius: .circular(6.px),
          fontSize: 0.85.rem,
          fontWeight: .w500,
          cursor: .pointer,
          transition: Transition('border-color', duration: const Duration(milliseconds: 200)),
        ),
        css('&:hover').styles(borderColor: primaryColor),
        css('.chevron').styles(fontSize: 0.6.rem, opacity: 0.5),
      ]),
      css('.dropdown-menu', [
        css('&').styles(
          display: .none,
          position: Position.absolute(top: 100.percent, left: 0.px),
          marginTop: 0.5.rem,
          backgroundColor: surfaceColor,
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
          radius: .circular(8.px),
          padding: .symmetric(vertical: 0.5.rem),
          minWidth: 180.px,
          listStyle: ListStyle.none,
          boxShadow: BoxShadow(
            blur: 12.px,
            color: const Color('rgba(0, 0, 0, 0.1)'),
          ),
          zIndex: ZIndex(1000),
        ),
        css('.version-switcher:hover &').styles(display: .block),
      ]),
      css('li a', [
        css('&').styles(
          display: .block,
          padding: .symmetric(horizontal: 1.rem, vertical: 0.75.rem),
          textDecoration: TextDecoration.none,
          transition: Transition('background-color', duration: const Duration(milliseconds: 150)),
        ),
        css('&:hover').styles(backgroundColor: const Color('color-mix(in srgb, var(--primary-color) 10%, transparent)')),
        css('.version-info').styles(
          display: .flex,
          flexDirection: .column,
          gap: Gap(row: 2.px),
        ),
        css('.version-label').styles(
          fontSize: 0.75.rem,
          fontWeight: .w600,
          textTransform: TextTransform.upperCase,
          letterSpacing: 0.05.em,
          color: textMutedColor,
        ),
        css('.version-number').styles(
          fontSize: 0.9.rem,
          color: textColor,
        ),
        css('.current-badge').styles(
          fontSize: 0.65.rem,
          padding: .symmetric(horizontal: 0.4.rem, vertical: 0.1.rem),
          backgroundColor: primaryColor,
          color: Colors.white,
          radius: .circular(4.px),
          width: .fitContent,
          marginTop: 0.25.rem,
        ),
        css('&.active .version-label').styles(color: primaryColor),
      ]),
    ]),
  ];
}
