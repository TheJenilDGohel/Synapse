// dart format off
// ignore_for_file: type=lint

// GENERATED FILE, DO NOT MODIFY
// Generated with jaspr_builder

import 'package:jaspr/server.dart';
import 'package:docs/components/callout.dart' as _callout;
import 'package:docs/components/card.dart' as _card;
import 'package:docs/components/code_block.dart' as _code_block;
import 'package:docs/components/header.dart' as _header;
import 'package:docs/components/search.dart' as _search;
import 'package:docs/components/sidebar.dart' as _sidebar;
import 'package:docs/components/tools_list.dart' as _tools_list;
import 'package:docs/components/version_switcher.dart' as _version_switcher;
import 'package:docs/constants/theme.dart' as _theme;
import 'package:docs/pages/home.dart' as _home;
import 'package:jaspr_content/components/theme_toggle.dart' as _theme_toggle;

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
    _search.Search: ClientTarget<_search.Search>('search'),
    _tools_list.ToolsList: ClientTarget<_tools_list.ToolsList>('tools_list'),
    _theme_toggle.ThemeToggle: ClientTarget<_theme_toggle.ThemeToggle>(
      'jaspr_content:theme_toggle',
    ),
  },
  styles: () => [
    ..._theme.styles,
    ..._callout.Callout.styles,
    ..._card.Card.styles,
    ..._code_block.CodeBlock.styles,
    ..._header.Header.styles,
    ..._search.Search.styles,
    ..._sidebar.Sidebar.styles,
    ..._tools_list.ToolsList.styles,
    ..._version_switcher.VersionSwitcher.styles,
    ..._home.Home.styles,
    ..._theme_toggle.ThemeToggleState.styles,
  ],
);
