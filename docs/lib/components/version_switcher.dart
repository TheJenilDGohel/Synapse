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
}
