import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import '../constants/site.dart';

class VersionSwitcher extends StatelessComponent {
  const VersionSwitcher({super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'version-switcher', [
      div(classes: 'version-dropdown', [
        span(classes: 'active-version', [
          Component.text(currentTrack == 'beta' ? betaVersion : stableVersion),
          span(classes: 'chevron', [Component.text('▼')]),
        ]),
        ul(classes: 'dropdown-menu', [
          li([
            a(href: '#', classes: currentTrack == 'stable' ? 'active' : '', [
              div(classes: 'version-info', [
                span(classes: 'version-label', [Component.text('Stable')]),
                span(classes: 'version-number', [Component.text(stableVersion)]),
              ]),
            ]),
          ]),
          li([
            a(href: '#', classes: currentTrack == 'beta' ? 'active' : '', [
              div(classes: 'version-info', [
                span(classes: 'version-label', [Component.text('Beta')]),
                span(classes: 'version-number', [Component.text(betaVersion)]),
                span(classes: 'current-badge', [Component.text('Active Beta')]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]);
  }
}
