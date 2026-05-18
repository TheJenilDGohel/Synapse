import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import '../constants/site.dart';

@client
class Search extends StatefulComponent {
  const Search({super.key});

  @override
  State<Search> createState() => _SearchState();
}

class _SearchState extends State<Search> {
  bool _isOpen = false;
  String _query = '';

  final List<({String title, String path, String description})> _pages = [
    (title: 'Introduction', path: '/intro', description: 'Loci Core: The local-first context layer.'),
    (title: 'Quick Start', path: '/tutorials/quickstart', description: 'Get running in 5 minutes.'),
    (title: 'Installation', path: '/how-to/install', description: 'System requirements and setup.'),
    (title: 'Configuration', path: '/how-to/configuration', description: 'Environment and JSON tuning.'),
    (title: 'Core Concepts', path: '/explanation/concepts', description: 'How the neural context engine works.'),
    (title: 'Architecture', path: '/explanation/architecture', description: 'Internal layers and data flow.'),
    (title: 'Code Intelligence', path: '/explanation/code-intelligence', description: 'AST-aware semantic search.'),
    (title: 'Persistent Memory', path: '/explanation/memory', description: 'Long-term cross-session recall.'),
    (title: 'Knowledge Graph', path: '/explanation/knowledge-graph', description: 'Temporal relationship tracking.'),
    (title: 'Power Controllers', path: '/reference/tools', description: 'Full MCP tool-call documentation.'),
    (title: 'CLI Reference', path: '/reference/cli', description: 'Commands and syntax.'),
    (title: 'Community', path: '/community', description: 'The Loci neural network.'),
  ];

  void _toggle() {
    setState(() {
      _isOpen = !_isOpen;
      if (!_isOpen) _query = '';
    });
  }

  @override
  Component build(BuildContext context) {
    var filteredPages = _pages
        .where(
          (p) =>
              p.title.toLowerCase().contains(_query.toLowerCase()) ||
              p.description.toLowerCase().contains(_query.toLowerCase()),
        )
        .toList();

    return div([
      div(
        classes: 'search-trigger',
        events: {
          'click': (e) => _toggle(),
        },
        [
          span([text('Search documentation...')]),
          Component.element(tag: 'kbd', children: [text('⌘K')]),
        ],
      ),

      if (_isOpen)
        div(
          classes: 'search-modal-overlay',
          events: {'click': (e) => _toggle()},
          [
            div(
              classes: 'search-modal',
              events: {
                'click': (e) => (e as dynamic).stopPropagation(),
              },
              [
                div(classes: 'search-input-container', [
                  input(
                    type: InputType.text,
                    classes: 'search-input',
                    attributes: {'placeholder': 'Search Loci...', 'autofocus': ''},
                    events: {
                      'input': (e) => setState(() => _query = (e.target as dynamic).value),
                    },
                  ),
                ]),
                div(classes: 'search-results', [
                  if (filteredPages.isEmpty)
                    div(classes: 'no-results', [text('No results for "$_query"')])
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
                          },
                        },
                        [
                          div(classes: 'item-title', [text(page.title)]),
                          div(classes: 'item-desc', [text(page.description)]),
                        ],
                      ),
                ]),
              ],
            ),
          ],
        ),
    ]);
  }
}
