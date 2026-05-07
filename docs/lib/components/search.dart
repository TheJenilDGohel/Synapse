import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import '../constants/theme.dart';
import '../constants/site.dart';

@client
class Search extends StatefulComponent {
  const Search({super.key});

  @override
  State<Search> createState() => _SearchState();

  @css
  static List<StyleRule> get styles => [
    css('.search-modal-overlay', [
      css('&').styles(
        position: Position.fixed(top: 0.px, left: 0.px, right: 0.px, bottom: 0.px),
        backgroundColor: const Color('rgba(0, 0, 0, 0.6)'),
        backdropFilter: Filter.blur(8.px),
        display: .flex,
        alignItems: .center,
        justifyContent: .center,
        zIndex: ZIndex(1000),
        padding: .all(1.rem),
      ),
      css('.search-modal', [
        css('&').styles(
          backgroundColor: surfaceColor,
          width: 100.percent,
          maxWidth: 600.px,
          maxHeight: 80.vh,
          radius: .circular(16.px),
          border: Border.all(color: borderColor, width: 1.px, style: BorderStyle.solid),
          shadow: BoxShadow(offsetX: 0.px, offsetY: 0.px, blur: 30.px, color: const Color('rgba(0, 0, 0, 0.4)')),
          display: .flex,
          flexDirection: .column,
          overflow: .hidden,
        ),
        css('.search-input-container').styles(
          padding: .all(1.rem),
          border: Border.only(bottom: BorderSide(color: borderColor, width: 1.px, style: BorderStyle.solid)),
        ),
        css('.search-input').styles(
          width: 100.percent,
          backgroundColor: Colors.transparent,
          color: textColor,
          fontSize: 1.125.rem,
          padding: .symmetric(horizontal: 1.rem, vertical: 0.75.rem),
          radius: .circular(8.px),
          border: Border.all(color: borderColor, width: 1.px, style: BorderStyle.solid),
          outline: const Outline(style: OutlineStyle.none),
        ),
        css('.search-results').styles(
          overflow: Overflow.auto,
          padding: .all(0.5.rem),
        ),
        css('.search-item', [
          css('&').styles(
            display: .block,
            padding: .all(0.75.rem),
            radius: .circular(8.px),
            transition: Transition('background-color', duration: const Duration(milliseconds: 200)),
            textDecoration: TextDecoration.none,
          ),
          css('&:hover').styles(
            backgroundColor: const Color('color-mix(in srgb, var(--primary-color) 12%, transparent)'),
          ),
          css('.item-title').styles(
            fontSize: 1.rem,
            fontWeight: .w600,
            color: textColor,
            margin: .only(bottom: 0.25.rem),
          ),
          css('.item-desc').styles(
            fontSize: 0.85.rem,
            color: textMutedColor,
          ),
        ]),
        css('.no-results').styles(
          padding: .all(2.rem),
          textAlign: TextAlign.center,
          color: textMutedColor,
        ),
      ]),
    ]),
  ];
}

class _SearchState extends State<Search> {
  bool _isOpen = false;
  String _query = '';

  final List<({String title, String path, String description})> _pages = [
    (title: 'Introduction', path: '/intro', description: 'Welcome to Synapse: the local-first context layer for AI agents.'),
    (title: 'Installation', path: '/install', description: 'Step-by-step guide to installing Synapse and its dependencies.'),
    (title: 'Quick Start', path: '/quickstart', description: 'Connect your AI client and run your first semantic query in minutes.'),
    (title: 'Persistent Memory', path: '/pillars/memory', description: 'Long-term semantic recall and cross-session AI memory.'),
    (title: 'Temporal Knowledge Graph', path: '/pillars/temporal', description: 'Track architectural facts and decisions over time with triple storage.'),
    (title: 'Code Intelligence', path: '/pillars/intel', description: 'AST-aware semantic code search and hybrid retrieval.'),
    (title: 'Architecture', path: '/pillars/architecture', description: 'Deep dive into the Synapse local runtime and storage layout.'),
    (title: 'Tools Overview', path: '/tools', description: 'Reference guide for the 74 specialized MCP tools available in Synapse.'),
    (title: 'Contributing', path: '/contributing', description: 'Join the community and help build the future of AI context.'),
    (title: 'Community', path: '/community', description: 'Connect with other developers and share Synapse patterns.'),
  ];

  void _toggle() {
    setState(() {
      _isOpen = !_isOpen;
      if (!_isOpen) _query = '';
    });
  }

  @override
  void initState() {
    super.initState();
  }

  @override
  Component build(BuildContext context) {
    var filteredPages = _pages.where((p) => 
      p.title.toLowerCase().contains(_query.toLowerCase()) || 
      p.description.toLowerCase().contains(_query.toLowerCase())
    ).toList();

    return div([
      div(classes: 'search-trigger', events: {'click': (e) => _toggle()}, [
        i(classes: 'search-icon', []),
        span([text('Search documentation...')]),
        Component.element(tag: 'kbd', children: [text('⌘K')]),
      ]),

      if (_isOpen)
        div(classes: 'search-modal-overlay', events: {'click': (e) => _toggle()}, [
          div(classes: 'search-modal', events: {
            'click': (e) {
              // Prevent closing when clicking inside
              (e as dynamic).stopPropagation();
            }
          }, [
            div(classes: 'search-input-container', [
              input(
                type: InputType.text,
                classes: 'search-input',
                attributes: {'placeholder': 'Type to search...', 'autofocus': ''},
                events: {
                  'input': (e) {
                    setState(() => _query = (e.target as dynamic).value);
                  }
                },
              ),
            ]),
            div(classes: 'search-results', [
              if (filteredPages.isEmpty)
                div(classes: 'no-results', [text('No results found for "$_query"')])
              else
                for (var page in filteredPages)
                  a(
                    href: publicPath(page.path),
                    classes: 'search-item',
                    events: {
                      'click': (e) {
                        (e as dynamic).preventDefault();
                        Router.of(context).push(page.path);
                        _toggle();
                       }
                    },
                    [
                      div([
                        div(classes: 'item-title', [text(page.title)]),
                        div(classes: 'item-desc', [text(page.description)]),
                      ]),
                    ],
                  ),
            ]),
          ]),
        ]),
    ]);
  }

}
