class Tool {
  final String name;
  final String description;
  final String category;
  final List<String> parameters;

  const Tool({
    required this.name,
    required this.description,
    required this.category,
    this.parameters = const [],
  });

  factory Tool.fromJson(Map<String, dynamic> json) {
    return Tool(
      name: json['name'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      parameters: (json['parameters'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
    );
  }
}
