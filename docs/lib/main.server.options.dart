// dart format off
// ignore_for_file: type=lint

// GENERATED FILE, DO NOT MODIFY
// Generated with jaspr_builder

import 'package:jaspr/server.dart';
import 'package:jaspr_content/components/theme_toggle.dart' as _theme_toggle;
import 'package:synapse_docs/components/search.dart' as _search;
import 'package:synapse_docs/components/tools_list.dart' as _tools_list;

/// Default [ServerOptions] for use with your Jaspr project.
///
/// Use this to initialize Jaspr **before** calling [runApp].
///
/// Example:
/// ```dart
/// import 'main.server.options.dart';
///
/// void main() {
///   Jaspr.initializeApp(
///     options: defaultServerOptions,
///   );
///
///   runApp(...);
/// }
/// ```
ServerOptions get defaultServerOptions => ServerOptions(
  clientId: 'main.client.dart.js',
  clients: {
    _theme_toggle.ThemeToggle: ClientTarget<_theme_toggle.ThemeToggle>(
      'jaspr_content:theme_toggle',
    ),
    _search.Search: ClientTarget<_search.Search>('search'),
    _tools_list.ToolsList: ClientTarget<_tools_list.ToolsList>('tools_list'),
  },
  styles: () => [..._theme_toggle.ThemeToggleState.styles],
);
