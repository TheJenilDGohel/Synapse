// dart format off
// ignore_for_file: type=lint

// GENERATED FILE, DO NOT MODIFY
// Generated with jaspr_builder

import 'package:jaspr/client.dart';

import 'package:jaspr_content/components/theme_toggle.dart'
    deferred as _theme_toggle;
import 'package:loci_docs/components/search.dart' deferred as _search;
import 'package:loci_docs/components/tools_list.dart' deferred as _tools_list;

/// Default [ClientOptions] for use with your Jaspr project.
///
/// Use this to initialize Jaspr **before** calling [runApp].
///
/// Example:
/// ```dart
/// import 'main.client.options.dart';
///
/// void main() {
///   Jaspr.initializeApp(
///     options: defaultClientOptions,
///   );
///
///   runApp(...);
/// }
/// ```
ClientOptions get defaultClientOptions => ClientOptions(
  clients: {
    'jaspr_content:theme_toggle': ClientLoader(
      (p) => _theme_toggle.ThemeToggle(),
      loader: _theme_toggle.loadLibrary,
    ),
    'search': ClientLoader(
      (p) => _search.Search(),
      loader: _search.loadLibrary,
    ),
    'tools_list': ClientLoader(
      (p) => _tools_list.ToolsList(),
      loader: _tools_list.loadLibrary,
    ),
  },
);
