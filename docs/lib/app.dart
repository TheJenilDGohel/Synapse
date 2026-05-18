import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import 'pages/home.dart';
import 'pages/about.dart';

class App extends StatelessComponent {
  final List<List<RouteBase>> contentRoutes;

  const App({required this.contentRoutes, super.key});

  @override
  Component build(BuildContext context) {
    return Router(
      routes: [
        Route(
          path: '/',
          title: 'Loci | Home',
          builder: (context, state) => const Home(),
        ),
        Route(
          path: '/about',
          title: 'Loci | Community',
          builder: (context, state) => const About(),
        ),
        for (var routes in contentRoutes) ...routes,
      ],
    );
  }
}
