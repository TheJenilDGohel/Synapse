/// The entrypoint for the **server** environment.
///
/// The [main] method will only be executed on the server during pre-rendering.
/// To run code on the client, check the `main.client.dart` file.
library;

import 'package:jaspr/dom.dart';
// Server-specific Jaspr import.
import 'package:jaspr/server.dart';

// Imports the [App] component.
import 'app.dart';

import 'package:jaspr_content/jaspr_content.dart';
import 'components/code_block.dart';
import 'components/callout.dart';
import 'components/tools_list.dart';
import 'constants/site.dart';
import 'layouts/docs_layout.dart' as local_layout;

// This file is generated automatically by Jaspr, do not remove or edit.
import 'main.server.options.dart';

void main() {
  // Initializes the server environment with the generated default options.
  Jaspr.initializeApp(
    options: defaultServerOptions,
  );

  // Starts the app.
  //
  // [Document] renders the root document structure (<html>, <head> and <body>)
  // with the provided parameters and components.
  runApp(
    Document(
      title: 'Synapse | Documentation',
      head: [
        if (siteBasePath.isNotEmpty) Component.element(tag: 'base', attributes: {'href': siteBaseHref}),
        link(
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
        ),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-dart.min.js'),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js'),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js'),
        Component.element(
          tag: 'script',
          children: [
            RawText('''
          window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              const trigger = document.querySelector('.search-trigger');
              if (trigger) trigger.click();
            }
          });
        '''),
          ],
        ),
      ],
      body: ContentApp.custom(
        loaders: [FilesystemLoader('content')],
        configResolver: PageConfig.all(
          parsers: [MarkdownParser()],
          layouts: [local_layout.DocsLayout()],
          components: [
            CustomComponent(
              pattern: 'code-block',
              builder: (context, attrs, content) => CodeBlock(
                sourceCode: attrs['code'] ?? '',
                language: attrs['lang'] ?? 'dart',
              ),
            ),
            CustomComponent(
              pattern: 'callout',
              builder: (context, attrs, content) => Callout(
                type: CalloutType.values.firstWhere((e) => e.name == attrs['type'], orElse: () => CalloutType.info),
                title: attrs['title'],
                child: content,
              ),
            ),
            CustomComponent(
              pattern: 'tools-list',
              builder: (context, attrs, content) => const ToolsList(),
            ),
          ],
        ),
        routerBuilder: (routes) => App(contentRoutes: routes),
      ),
    ),
  );
}
