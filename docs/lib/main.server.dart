/// The entrypoint for the **server** environment.
///
/// The [main] method will only be executed on the server during pre-rendering.
/// To run code on the client, check the `main.client.dart` file.
import 'package:jaspr/dom.dart';
// Server-specific Jaspr import.
import 'package:jaspr/server.dart';

import 'package:jaspr_content/jaspr_content.dart';
import 'package:jaspr_content/theme.dart';

import 'components/code_block.dart' as local;
import 'components/callout.dart' as local;
import 'components/tools_list.dart' as local;
import 'constants/site.dart';
import 'layouts/docs_layout.dart' as local;
import 'app.dart';

// This file is generated automatically by Jaspr, do not remove or edit.
import 'main.server.options.dart';

void main() {
  // Initializes the server environment with the generated default options.
  Jaspr.initializeApp(
    options: defaultServerOptions,
  );

  // Starts the app.
  //
  // [ContentApp] spins up the content rendering pipeline from jaspr_content to render
  // your markdown files in the content/ directory to a beautiful documentation site.
  runApp(
    Document(
      title: 'Loci | Documentation',
      head: [
        if (siteBasePath.isNotEmpty) Component.element(tag: 'base', attributes: {'href': siteBaseHref}),
        // SEO Meta Tags
        meta(name: 'description', content: 'Loci combines semantic code search, temporal knowledge graph, and persistent AI memory into one local MCP server.'),
        meta(name: 'keywords', content: 'MCP, AI agents, code search, semantic search, knowledge graph, local-first, memory, sqlite'),
        meta(name: 'author', content: 'Jenil'),
        meta(name: 'robots', content: 'index, follow'),
        // OpenGraph
        meta(attributes: {'property': 'og:title', 'content': 'Loci | Unified Context Layer for AI Agents'}),
        meta(attributes: {'property': 'og:description', 'content': 'The only MCP server combining semantic code search, temporal knowledge graph, and persistent AI memory. 74 tools, zero cloud, pure SQLite.'}),
        meta(attributes: {'property': 'og:type', 'content': 'website'}),
        meta(attributes: {'property': 'og:url', 'content': 'https://thejenildgohel.github.io/Loci/'}),
        // Twitter Card
        meta(name: 'twitter:card', content: 'summary_large_image'),
        meta(name: 'twitter:title', content: 'Loci | Unified Context Layer for AI Agents'),
        meta(name: 'twitter:description', content: 'The minimalist transmission layer for AI context. Zero cloud. Local-first. Pure SQLite.'),

        link(
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
        ),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-dart.min.js'),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js'),
        script(src: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js'),
        link(rel: 'stylesheet', href: publicPath('styles.css')),
      ],
      body: ContentApp.custom(
        loaders: [FilesystemLoader('content')],
        configResolver: PageConfig.all(
          parsers: [MarkdownParser()],
          layouts: [local.DocsLayout()],
          components: [
            CustomComponent(
              pattern: 'callout',
              builder: (context, attrs, content) => local.Callout(
                type: local.CalloutType.values.firstWhere((e) => e.name == attrs['type'], orElse: () => local.CalloutType.info),
                title: attrs['title'],
                child: content,
              ),
            ),
            CustomComponent(
              pattern: 'code-block',
              builder: (context, attrs, content) => local.CodeBlock(
                sourceCode: attrs['code'] ?? '',
                language: attrs['lang'] ?? 'dart',
              ),
            ),
            CustomComponent(
              pattern: 'tools-list',
              builder: (context, attrs, content) => const local.ToolsList(),
            ),
          ],
        ),
        routerBuilder: (routes) => App(contentRoutes: routes),
      ),
    ),
  );
}
