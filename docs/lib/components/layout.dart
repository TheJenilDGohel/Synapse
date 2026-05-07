import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';


import 'header.dart';
import 'sidebar.dart';

class DocsLayout extends StatefulComponent {
  const DocsLayout({required this.child, super.key});

  final Component child;

  @override
  State<DocsLayout> createState() => _DocsLayoutState();

  @css
  static List<StyleRule> get styles => [
    css('.layout-root', [
      css('&').styles(
        display: .flex,
        width: 100.percent,
        minHeight: 100.vh,
      ),
      css('.layout-main', [
        css('&').styles(
          display: .flex,
          flexDirection: .column,
          flex: Flex(grow: 1),
          height: 100.vh,
          overflow: Overflow.auto,
        ),
      ]),
      css('.layout-content', [
        css('&').styles(
          padding: .symmetric(horizontal: 4.rem, vertical: 3.rem),
          maxWidth: 900.px,
          margin: .only(left: .auto, right: .auto),
          flex: Flex(grow: 1),
        ),
        // Mobile padding
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('&').styles(padding: .symmetric(horizontal: 1.5.rem, vertical: 2.rem)),
        ]),
      ]),
      css('.sidebar-overlay', [
        css('&').styles(
          position: Position.fixed(top: 0.px, left: 0.px, right: 0.px, bottom: 0.px),
          backgroundColor: const Color('rgba(0, 0, 0, 0.6)'),
          backdropFilter: Filter.blur(8.px),
          zIndex: ZIndex(90),
          display: .none,
        ),
        css.media(MediaQuery.screen(maxWidth: 768.px), [
          css('.sidebar-open &').styles(display: .block),
        ]),
      ]),
    ]),
  ];
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
      if (_isSidebarOpen)
        div(classes: 'sidebar-overlay', events: {'click': (e) => _toggleSidebar()}, []),
    ]);
  }
}

