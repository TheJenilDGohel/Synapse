import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import '../constants/site.dart';

class DocsLink extends StatelessComponent {
  final String to;
  final String? classes;
  final Component child;

  const DocsLink({
    required this.to,
    required this.child,
    this.classes,
    super.key,
  });

  @override
  Component build(BuildContext context) {
    return a(
      href: publicPath(to),
      classes: classes,
      events: {
        'click': (event) {
          final router = Router.maybeOf(context);
          if (router == null) return;
          event.preventDefault();
          router.push(to);
        },
      },
      [child],
    );
  }
}
