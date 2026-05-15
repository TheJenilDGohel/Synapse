import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/jaspr_content.dart';

import '../components/header.dart';
import '../components/sidebar.dart';
import '../constants/site.dart';

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
      div(classes: 'mesh-gradient', []),
      input(type: InputType.checkbox, id: 'sidebar-toggle', classes: 'sidebar-toggle-input'),
      const Sidebar(),
      div(classes: 'layout-main', [
        const Header(),
        if (currentTrack == 'beta')
          div(classes: 'beta-banner', [
            span(classes: 'beta-tag', [text('BETA')]),
            text(' You are viewing the documentation for the upcoming '),
            strong([text(betaVersion)]),
            text(' release.'),
          ]),
        main_(classes: 'layout-content', [
          div(classes: 'content-inner', [
            child,
          ]),
        ]),
      ]),
      label(classes: 'sidebar-overlay', htmlFor: 'sidebar-toggle', []),
    ]);
  }
}
