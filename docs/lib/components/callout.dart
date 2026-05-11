import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';

enum CalloutType {
  info(Color('#38bdf8'), 'ℹ️', 'Note'),
  tip(Color('#10b981'), '💡', 'Tip'),
  warning(Color('#f59e0b'), '⚠️', 'Warning'),
  danger(Color('#ef4444'), '🚨', 'Danger')
  ;

  final Color color;
  final String icon;
  final String label;
  const CalloutType(this.color, this.icon, this.label);
}

class Callout extends StatelessComponent {
  final Component? child;
  final String? message;
  final CalloutType type;
  final String? title;

  const Callout({this.child, this.message, this.type = CalloutType.info, this.title, super.key});

  @override
  Component build(BuildContext context) {
    return div(
      classes: 'callout callout-${type.name}',
      styles: Styles(
        border: Border.only(
          left: BorderSide(style: BorderStyle.solid, color: type.color, width: 4.px),
        ),
      ),
      [
        div(classes: 'callout-header', [
          span(classes: 'callout-icon', [Component.text(type.icon)]),
          span(classes: 'callout-title', [Component.text(title ?? type.label)]),
        ]),
        div(classes: 'callout-content', [
          if (child != null) child! else if (message != null) p([Component.text(message!)]),
        ]),
      ],
    );
  }

  @css
  static List<StyleRule> get styles => [
    css('.callout', [
      css('&').styles(
        margin: .symmetric(vertical: 1.5.rem),
        padding: .all(1.25.rem),
        radius: .circular(8.px),
        backgroundColor: surfaceColor,
      ),
      css('.callout-header', [
        css('&').styles(
          display: .flex,
          alignItems: .center,
          gap: Gap(column: 0.75.rem),
          margin: .only(bottom: 0.75.rem),
        ),
        css('.callout-icon').styles(fontSize: 1.25.rem),
        css('.callout-title').styles(
          fontWeight: .w700,
          fontSize: 1.rem,
          textTransform: TextTransform.upperCase,
          letterSpacing: 0.025.em,
        ),
      ]),
      css('.callout-content p').styles(
        margin: .zero,
        color: textColor.withOpacity(0.8),
        lineHeight: Unit.expression('1.6'),
      ),

      // Type specific overrides if needed
      css('.callout-info .callout-title').styles(color: CalloutType.info.color),
      css('.callout-tip .callout-title').styles(color: CalloutType.tip.color),
      css('.callout-warning .callout-title').styles(color: CalloutType.warning.color),
      css('.callout-danger .callout-title').styles(color: CalloutType.danger.color),
    ]),
  ];
}
