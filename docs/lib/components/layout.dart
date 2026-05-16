import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import 'header.dart';
import 'sidebar.dart';

class DocsLayout extends StatefulComponent {
  const DocsLayout({required this.child, super.key});

  final Component child;

  @override
  State<DocsLayout> createState() => _DocsLayoutState();
}

class _DocsLayoutState extends State<DocsLayout> {
  bool _isSidebarOpen = false;

  void _toggleSidebar() {
    setState(() {
      _isSidebarOpen = !_isSidebarOpen;
    });
  }

  @override
  Component build(BuildContext context) {
    return div(classes: 'layout-root ${_isSidebarOpen ? 'sidebar-open' : ''}', [
      const Sidebar(),
      div(classes: 'layout-main', [
        Header(onMenuTap: _toggleSidebar),
        main_(classes: 'layout-content', [
          component.child,
        ]),
      ]),
      // Overlay for mobile
      if (_isSidebarOpen) div(classes: 'sidebar-overlay', events: {'click': (e) => _toggleSidebar()}, []),
    ]);
  }
}
