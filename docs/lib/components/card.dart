import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import '../constants/theme.dart';

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
      ],
    );
  }

  @css
  static List<StyleRule> get styles => [
    css('.custom-card', [
      css('&').styles(
        padding: .all(2.rem),
        backgroundColor: surfaceColor,
        border: Border.all(color: borderColor, width: 1.px, style: BorderStyle.solid),
        radius: .circular(24.px),
        transition: Transition('all', duration: const Duration(milliseconds: 300)),
        display: .flex,
        flexDirection: .column,
        gap: Gap(column: 0.5.rem),
      ),
      css('&.clickable').styles(cursor: .pointer),
      css('&.clickable:hover').styles(
        transform: Transform.translate(y: (-8).px),
        border: Border.all(color: primaryColor.withOpacity(0.4), width: 1.px, style: BorderStyle.solid),
        shadow: BoxShadow(offsetX: 0.px, offsetY: 4.px, blur: 20.px, color: primaryColor.withOpacity(0.12)),
      ),
      css('.card-icon').styles(
        fontSize: 2.5.rem,
        margin: .only(bottom: 1.rem),
      ),
      css('h3').styles(
        fontSize: 1.25.rem,
        margin: .zero,
        fontWeight: .w700,
      ),
      css('p').styles(
        color: textMutedColor,
        lineHeight: Unit.expression('1.6'),
        margin: .zero,
      ),
    ]),
  ];
}
