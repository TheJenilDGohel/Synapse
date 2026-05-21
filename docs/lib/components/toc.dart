import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class SynapseTOC extends StatelessComponent {
  const SynapseTOC({super.key});

  @override
  Component build(BuildContext context) {
    return aside(classes: 'toc-sidebar', [
      div(classes: 'toc-container', [
        h3([Component.text('On this page')]),
        nav([
          ul([
            // In a real Jaspr app with Markdown, we'd extract these from the content.
            // For now, we'll provide a placeholder or a base structure.
            li([a(href: '#', [Component.text('Overview')])]),
          ]),
        ]),
      ]),
    ]);
  }
}
