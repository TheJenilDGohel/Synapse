import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getNodeName, buildScopePath, TreeSitterNode, buildASTRenderContext } from './ast-utils.js';

describe('ast-utils optimization', () => {
  const mockNode = (type: string, text: string, parent: any = null): TreeSitterNode => {
    const node: any = {
      type,
      text,
      parent,
      namedChildren: [],
      childForFieldName: (name: string) => null,
    };
    if (parent) {
      parent.namedChildren.push(node);
    }
    return node;
  };

  test('buildASTRenderContext builds a name map', () => {
    const root = mockNode('program', '');
    const classNode = mockNode('class_declaration', '', root);
    const className = mockNode('identifier', 'MyClass', classNode);
    classNode.childForFieldName = (name: string) => name === 'name' ? className : null;

    const methodNode = mockNode('method_definition', '', classNode);
    const methodName = mockNode('identifier', 'myMethod', methodNode);
    methodNode.childForFieldName = (name: string) => name === 'name' ? methodName : null;

    const context = buildASTRenderContext(root);
    assert.strictEqual(context.nameMap.get(classNode), 'MyClass');
    assert.strictEqual(context.nameMap.get(methodNode), 'myMethod');
  });

  test('getNodeName uses cache from context', () => {
    const node = mockNode('class_declaration', '');
    const nameMap = new WeakMap<TreeSitterNode, string>();
    nameMap.set(node, 'CachedName');

    const name = getNodeName(node, nameMap);
    assert.strictEqual(name, 'CachedName');
  });

  test('buildScopePath uses cache from context', () => {
    const root = mockNode('program', '');
    const classNode = mockNode('class_declaration', '', root);
    const className = mockNode('identifier', 'MyClass', classNode);
    classNode.childForFieldName = (name: string) => name === 'name' ? className : null;

    const methodNode = mockNode('method_definition', '', classNode);
    const methodName = mockNode('identifier', 'myMethod', methodNode);
    methodNode.childForFieldName = (name: string) => name === 'name' ? methodName : null;

    const nameMap = new WeakMap<TreeSitterNode, string>();
    nameMap.set(classNode, 'MyClass');
    nameMap.set(methodNode, 'myMethod');

    const path = buildScopePath(methodNode, 'typescript', nameMap);
    assert.strictEqual(path, 'MyClass > myMethod');
  });
});
