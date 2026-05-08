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

  @css
  static List<StyleRule> get styles => [
    css('.code-block-container', [
      css('&').styles(
        margin: .symmetric(vertical: 1.5.rem),
        radius: .circular(12.px),
        overflow: Overflow.hidden,
        backgroundColor: Color('#1e293b'), // Slate 800
        border: Border.all(color: borderColor, width: 1.px, style: BorderStyle.solid),
      ),
      css('.code-block-header', [
        css('&').styles(
          display: .flex,
          justifyContent: .spaceBetween,
          alignItems: .center,
          padding: .symmetric(horizontal: 1.rem, vertical: 0.5.rem),
          backgroundColor: backgroundColor.withOpacity(0.2),
          border: Border.only(
            bottom: BorderSide(style: BorderStyle.solid, color: borderColor, width: 1.px),
          ),
        ),
        css('.code-block-lang').styles(
          fontSize: 0.75.rem,
          fontWeight: .w600,
          color: textMutedColor,
          textTransform: TextTransform.upperCase,
        ),
        css('.copy-btn').styles(
          backgroundColor: Colors.transparent,
          border: .none,
          color: textMutedColor,
          fontSize: 0.75.rem,
          cursor: .pointer,
          transition: Transition('color', duration: const Duration(milliseconds: 200)),
        ),
        css('.copy-btn:hover').styles(color: textColor),
      ]),
      css('pre').styles(
        margin: .zero,
        padding: .all(1.rem),
        overflow: Overflow.auto,
        backgroundColor: Colors.transparent,
      ),
      css('code').styles(
        fontFamily: const .list([FontFamily('Fira Code'), FontFamily('monospace')]),
        fontSize: 0.9.rem,
      ),
    ]),
  ];
}
