import 'dart:convert';
import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:http/http.dart' as http;

import '../models/tool.dart';
import '../constants/site.dart';

@client
class ToolsList extends StatelessComponent {
  const ToolsList({super.key});

  @override
  Component build(BuildContext context) {
    return const ToolsListContent();
  }
}

class ToolsListContent extends StatefulComponent {
  const ToolsListContent({super.key});

  @override
  State<ToolsListContent> createState() => _ToolsListState();
}

class _ToolsListState extends State<ToolsListContent> {
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
