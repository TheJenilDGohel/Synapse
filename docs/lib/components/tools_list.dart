import 'dart:convert';
import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:http/http.dart' as http;

import '../models/tool.dart';
import '../constants/theme.dart';
import '../constants/site.dart';

@client
class ToolsList extends StatefulComponent {
  const ToolsList({super.key});

  @override
  State<ToolsList> createState() => _ToolsListState();

  @css
  static List<StyleRule> get styles => [
    css('.tools-container', [
      css('&').styles(
        minHeight: 400.px,
        raw: {'transition': 'opacity 0.3s ease-in-out'},
      ),
      css('h2').styles(
        margin: .only(top: 2.rem, bottom: 1.rem),
        fontSize: 1.5.rem,
        color: primaryColor,
      ),
      css('.tool-grid', [
        css('&').styles(
          display: .grid,
          raw: {'grid-template-columns': 'repeat(auto-fill, minmax(300px, 1fr))'},
          gap: Gap.row(1.5.rem),
        ),
      ]),
      css('.tool-card', [
        css('&').styles(
          backgroundColor: surfaceColor,
          border: Border.all(color: borderColor, width: 1.px, style: BorderStyle.solid),
          radius: .circular(12.px),
          padding: .all(1.5.rem),
          transition: Transition('transform, border-color, box-shadow', duration: const Duration(milliseconds: 200)),
        ),
        css('&:hover').styles(
          raw: {
            'transform': 'translateY(-4px)',
            'border-color': primaryColor.value,
            'box-shadow': '0 10px 20px -10px ${primaryColor.withOpacity(0.2).value}',
          },
        ),
        css('.tool-header').styles(margin: .only(bottom: 0.75.rem)),
        css('code').styles(
          fontSize: 1.rem,
          color: secondaryColor,
          backgroundColor: backgroundColor,
          padding: .symmetric(horizontal: 0.5.rem, vertical: 0.25.rem),
          radius: .circular(4.px),
        ),
        css('p').styles(
          fontSize: 0.9.rem,
          color: textMutedColor,
          margin: .zero,
        ),
        css('.tool-params').styles(
          margin: .only(top: 1.rem),
          fontSize: 0.8.rem,
          display: .flex,
          flexWrap: .wrap,
          alignItems: .center,
          gap: Gap.row(0.5.rem),
        ),
        css('.param-badge').styles(
          backgroundColor: backgroundColor.withOpacity(0.5),
          color: textMutedColor,
          padding: .symmetric(horizontal: 0.4.rem, vertical: 0.1.rem),
          radius: .circular(4.px),
          border: Border.all(style: BorderStyle.solid, color: borderColor, width: 1.px),
        ),
      ]),
      css('.loading-container').styles(
        display: .flex,
        alignItems: .center,
        justifyContent: .center,
        height: 200.px,
        color: textMutedColor,
        fontSize: 1.125.rem,
      ),
    ]),
  ];
}

class _ToolsListState extends State<ToolsList> {
  List<Tool>? _tools;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      _loadTools();
    }
  }

  Future<void> _loadTools() async {
    try {
      // In a real static app, this would be a relative path to the asset
      final response = await http.get(Uri.parse(publicPath('/assets/data/tools.json')));
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (!mounted) return;
        setState(() {
          _tools = data.map((json) => Tool.fromJson(json)).toList();
        });
      } else {
        if (!mounted) return;
        setState(() {
          _error = 'Failed to load tools: ${response.statusCode}';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Error loading tools: $e';
      });
    }
  }

  @override
  Component build(BuildContext context) {
    if (_error != null) {
      return div(classes: 'tools-container error-box', [text(_error!)]);
    }

    if (_tools == null) {
      return div(classes: 'tools-container loading-container', [
        div(classes: 'spinner', []),
        text(' Discovering tools...'),
      ]);
    }

    // Group tools by category
    final categories = <String, List<Tool>>{};
    for (var tool in _tools!) {
      categories.putIfAbsent(tool.category, () => []).add(tool);
    }

    return div(classes: 'tools-container', [
      for (var category in categories.keys)
        div(classes: 'tool-category', [
          h2([text(category)]),
          div(classes: 'tool-grid', [
            for (var tool in categories[category]!)
              div(classes: 'tool-card', [
                div(classes: 'tool-header', [
                  code([text(tool.name)]),
                ]),
                p([text(tool.description)]),
                if (tool.parameters.isNotEmpty)
                  div(classes: 'tool-params', [
                    span([text('Parameters: ')]),
                    for (var param in tool.parameters) span(classes: 'param-badge', [text(param)]),
                  ]),
              ]),
          ]),
        ]),
    ]);
  }
}
