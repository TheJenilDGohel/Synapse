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
}
