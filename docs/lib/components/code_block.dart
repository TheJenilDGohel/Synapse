import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';

class CodeBlock extends StatelessComponent {
  final String sourceCode;
  final String language;

  const CodeBlock({required this.sourceCode, this.language = 'dart', super.key});

  @override
  Component build(BuildContext context) {
    return div(classes: 'code-block-container', [
      div(classes: 'code-block-header', [
        span(classes: 'code-block-lang', [Component.text(language)]),
        button(classes: 'copy-btn', [Component.text('Copy')]),
      ]),
      pre(classes: 'language-$language', [
        code(classes: 'language-$language', [Component.text(sourceCode)]),
      ]),
    ]);
  }
}
