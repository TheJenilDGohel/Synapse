const siteBasePath = String.fromEnvironment('SITE_BASE_PATH');

String get siteBaseHref {
  if (siteBasePath.isEmpty) {
    return '/';
  }

  final normalized = siteBasePath.startsWith('/') ? siteBasePath : '/$siteBasePath';
  return normalized.endsWith('/') ? normalized : '$normalized/';
}

String publicPath(String routePath) {
  final path = routePath.startsWith('/') ? routePath : '/$routePath';
  if (siteBasePath.isEmpty) {
    return path;
  }

  final base = siteBasePath.endsWith('/') ? siteBasePath.substring(0, siteBasePath.length - 1) : siteBasePath;
  return '$base$path';
}
