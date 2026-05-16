import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class Card extends StatelessComponent {
  final String title;
  final String description;
  final String? icon;
  final Component? child;
  final VoidCallback? onTap;

  const Card({
    required this.title,
    required this.description,
    this.icon,
    this.child,
    this.onTap,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return div(
      classes: 'custom-card ${onTap != null ? 'clickable' : ''}',
      events: onTap != null ? {'click': (e) => onTap!()} : {},
      [
        if (icon != null) div(classes: 'card-icon', [text(icon!)]),
        h3([text(title)]),
        p([text(description)]),
        if (child != null) child!,
        div(classes: 'card-glint', []),
      ],
    );
  }
}
