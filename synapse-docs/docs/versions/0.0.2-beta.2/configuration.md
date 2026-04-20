# 0.0.2-beta.2 Configuration

<div className="docPanel docPanel--compact">
  <p>
    Configuration in this beta is defined as much by the MCP tool contract as by environment
    variables: canonical names, pagination, and alternate response formats all arrive here.
  </p>
</div>

## Important behavior

- canonical `synapse_*` names coexist with legacy aliases
- list-style tools return paginated structures with `items`
- tool responses may be returned as `json` or `markdown`

## Indexing

This release already includes pluggable vector backends and broader config coverage than the first beta.

## Operational caveat

- duplicate tool names in some MCP clients are expected here because aliases still exist
